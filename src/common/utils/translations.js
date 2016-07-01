import app from '../../server/server'; // relative to file which does the import...
import Promise from 'bluebird';
import _ from 'lodash';
import validate_uuid from 'uuid-validate';
import uuid from 'uuid';
import path from 'path';

/*
  FInd all models to match filter and translate them
*/
export function getTranslationsForModel(model, lang, filter) {
  const findModel = Promise.promisify(model.find, { context: model });

  return new Promise((resolve, reject) => {
    const allPromises = [];
    const allTranslated = [];
    findModel(filter)
      .then(instances => {
        _.forEach(instances, instance => {
          const translatedInstance = {};
          const promises = [];

          _.forEach(instance.__data, (value, key) => {
            translatedInstance[key] = value;
            if (isUUID(value)) {  // test if field value is guid and get cleartext of it
              const promiseOfTranslation = getTranslation(lang, value)
                .then(tr => {
                  if (!tr) translatedInstance[key] = '';
                  else {
                    translatedInstance[key] = tr.text;
                  }
                  return translatedInstance[key];
                });
              promises.push(promiseOfTranslation);
              allPromises.push(promiseOfTranslation);
            }
          });

          return Promise.all(promises)
            .then(() => {
              // push single translated instance to completed list
              allTranslated.push(translatedInstance);
            });
        });
      })
      .then(() => {
        Promise.all(allPromises)
          .then(val => {
            // finally return them
            resolve(allTranslated);
          });
      })
      .catch(err => reject(err));
  });
}

/*
  Translate single model instance
*/
export function translateModel(modelInstance, lang) {

  return new Promise((resolve, reject) => {
    const translatedInstance = {};
    const promises = [];

    /*
      NOT EXACTLY SAME AS ABOVE
    */
    _.forEach(modelInstance, (value, key) => {
      translatedInstance[key] = value;
      if (isUUID(value)) {  // test if field value is guid and get cleartext of it
        const promiseOfTranslation = getTranslation(lang, value)
          .then(tr => {
            if (!tr) translatedInstance[key] = '';
            else {
              translatedInstance[key] = tr.text;
            }
            return translatedInstance[key];
          });
        promises.push(promiseOfTranslation);
      }
    });

    Promise.all(promises)
    .then(() => resolve(translatedInstance));
  });
}

/*
  Turn single guid into cleartext
*/
export function getTranslation(lang, guid) {
  const TranslationModel = app.models.Translation;
  const findTranslation = Promise.promisify(TranslationModel.findOne, { context: TranslationModel });
  return findTranslation({ where: {
    and: [
      { guId: guid },
      { lang: lang },
    ] } });
}

export function isUUID(text) {
  return (validate_uuid(text, 1) || validate_uuid(text, 4)) ? true : false;
}

/*
  Get default language if lang is not found
*/
export function getLangIfNotExists(lang) {
  const TranslationModel = app.models.Translation;
  const countTranslation = Promise.promisify(TranslationModel.count, { context: TranslationModel });

  return new Promise((resolve, reject) => {
    if (!lang) resolve('EN');
    else countTranslation({ lang: lang })
      .then(count => {
        if (count == 0) resolve('EN');
        else resolve(lang);
      });
  });
}

export function createTranslationsForModel(modelName, jsonData) {
  const model = app.models[modelName];
  const createModel = Promise.promisify(model.create, { context: model });
  const TranslationModel = app.models.Translation;
  const createTranslation = Promise.promisify(TranslationModel.create, { context: TranslationModel });

  return new Promise((resolve, reject) => {
    // make data into array if it isn't already
    if (!_.isArray(jsonData)) jsonData = [jsonData];

    const modelsCreatedPromices = [];
    _.forEach(jsonData, fixture => {
      const modelJSON = {
        'lastModified': fixture.lastModified || Date.now(), // automatically set lastModified
      };
      const translations = [];

      _.forEach(fixture, (value, key) => {
        if (typeof value === 'object') {
          // generate model JSON with uuids in case of translation
          const textUuid = uuid.v1();
          modelJSON[key] = textUuid;

          // add translations too
          _.forEach(value, (text, lang) => {
            translations.push({
              'lang': lang,
              'text': text,
              'guId': textUuid,
            });
          });
        } else {
          modelJSON[key] = value;
        }
      });

      createModel(modelJSON)
      .then(modelsCreatedPromices.push(createTranslation(translations)))
      .catch(err => reject(err));
    });

    Promise.all(modelsCreatedPromices).then(val => resolve(val));
  });
}

/*
  Update text of single translation
*/
export function updateTranslation(lang, guId, newText) {
  return getTranslation(lang, guId)
    .then(translation => Promise.fromCallback(callback => {
      translation.text = newText;
      translation.save(callback);
    }));
}

/*
  Update text of multiple translations of single field
*/
function updateTranslationsForSingleField(fieldGuid, newValues) {
  return Promise.all(_.map(newValues, (newText, lang) => updateTranslation(lang, fieldGuid, newText)));
}

/*
  Update all fields for single model instance
*/
export function updateTranslationsForModel(modelName, data, where) {
  const model = app.models[modelName];
  const findModel = Promise.promisify(model.find, { context: model });

  return findModel({ where: where })
    .each(instance => {
      const translatedFields = _.pickBy(instance.__data, (value, key) => isUUID(value) && isTranslation(data[key]));
      const nonTranslatedFields = _.pickBy(instance.__data, (value, key) => !isUUID(value));

      // Promise updates for translated fields
      const translationSavePromise = Promise.all(_.map(translatedFields, (guId, fieldName) => {
        const newValues = data[fieldName];
        if (newValues) {
          return updateTranslationsForSingleField(guId, newValues);
        } else {
          return Promise.resolve();
        }
      }));

      // Promise updates for nontranslated fields
      const nonTranslatedFieldsSavePromise = Promise.fromCallback(callback => {
        _.forEach(nonTranslatedFields, (value, key) => instance[key] = data[key] || instance[key]);
        instance.save(callback);
      });

      return Promise.join(translationSavePromise, nonTranslatedFieldsSavePromise);
    });
}

function isTranslation(value) {
  return typeof(value) === 'object';
}

/*
  Update models data to match current state of "active" remote data (newFixtures).
  Creates new if model is not found.
  Updates existing models.
  Deletes or marks as deleted models that no longer exist in remote data
*/
export function CRUDModels(modelName, newFixtures, linkingKey, soft, whereFilter) {
  const findModels = Promise.promisify(app.models[modelName].find, { context: app.models[modelName] });
  const updateModel = Promise.promisify(app.models[modelName].updateAll, { context: app.models[modelName] });
  const destroyModels = Promise.promisify(app.models[modelName].destroyAll, { context: app.models[modelName] });

  const toUpdate = [];
  const toCreate = [];
  const toDelete = [];

  const currentIds = [];
  const newIds = [];

  return new Promise((resolve, reject) => {
    let where = { where: { deleted: false } };
    if (whereFilter) {
      where = whereFilter;
    }
    findModels(where) // get all current
    .then(currentData => {
      _.forEach(currentData, currentInstance => {
        currentIds.push(currentInstance[linkingKey]);
      });
      _.forEach(newFixtures, newFixture => {
        newIds.push(newFixture[linkingKey]);
        if (currentIds.indexOf(newFixture[linkingKey]) == -1) {
          toCreate.push(newFixture);
        } else {
          toUpdate.push(newFixture);
        }
      });

      _.forEach(currentData, currentInstance => {
        if (newIds.indexOf(currentInstance[linkingKey]) == -1) {
          toDelete.push(currentInstance);
        }
      });
    })
    .then(() => {
      createTranslationsForModel(modelName, toCreate);
    })
    .then(() => {
      _.forEach(toUpdate, upd => {
        updateTranslationsForModel(modelName, upd, { [linkingKey]: upd[linkingKey] });
      });
    })
    .then(() => {
      _.forEach(toDelete, del => {
        if (soft) {
          console.log('Warning! using soft delete may not work properly!');
          updateModel({ [linkingKey]: del[linkingKey] }, { deleted: true, lastModified: Date.now() });
        } else {
          destroyModels({ [linkingKey]: del[linkingKey] });
        }
      });
    })
    .then(() => {
      resolve();
    })
    .catch(err => {
      console.log('Error happened');
      console.log('Please make sure your model has "deleted" field even if softdelete is not used');
      reject(err);
    });
  });
}

export function getLocalFieldTranslations(translationsFile, fieldValueKey, langs, defaultValue) {
  return Promise.try(() => require(path.resolve(__dirname, `./localTranslations/${translationsFile}`)))
  .then(translationData => {
    const returnable = {};
    if (translationData[fieldValueKey]) {
      _.forEach(translationData[fieldValueKey], (text, lang) => {
        if (langs.indexOf(lang) !== -1) {
          returnable[langs[langs.indexOf(lang)]] = text;
        } else {
          returnable[lang] = defaultValue;
        }
      });
    } else {
      _.forEach(langs, lang => {
        returnable[lang] = defaultValue;
      });
    }
    return returnable;
  })
  .catch(err => {
    console.error('Error while locally translating values:', err);
  });
}
