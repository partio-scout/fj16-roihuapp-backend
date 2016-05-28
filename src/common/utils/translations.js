import app from '../../server/server'; // relative to file which does the import...
import Promise from 'bluebird';
import _ from 'lodash';
import validate_uuid from 'uuid-validate';
import uuid from 'uuid';

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
  Update all fields for single model instance
*/
export function updateTranslationsForModel(modelName, data, where) {
  const model = app.models[modelName];
  const findModel = Promise.promisify(model.find, { context: model });
  const TranslationModel = app.models.Translation;
  const findTranslation = Promise.promisify(TranslationModel.find, { context: TranslationModel });

  return new Promise((resolve, reject) => {
    findModel({ where: where })
    .then(models => {
      // should be only one instance, but use foreach just-in-case
      _.forEach(models, instance => {
        _.forEach(instance.__data, (value, key) => {
          // current field is uuid and data has possible translations for it
          if (isUUID(value) && ( typeof data[key] === 'object' )) {
            findTranslation({ where: { guId: value } })
            .then(translations => {
              _.forEach(translations, translationObj => {
                if (data[key][translationObj.lang]) {
                  translationObj.text = data[key][translationObj.lang];
                  translationObj.save();
                }
              });
            });
          } else if (data[key] && (data[key] !== instance[key])) {
            instance[key] = data[key];
            instance.save();  // saving here is propably not the best for DB performance
          }
        });
      });
    })
    .then(() => resolve());
  });
}

/*
  Update models data to match current state of "active" remote data (newFixtures).
  Creates new if model is not found.
  Updates existing models.
  Deletes or marks as deleted models that no longer exist in remote data
*/
export function CRUDModels(modelName, newFixtures, soft) {
  const findModels = Promise.promisify(app.models[modelName].find, { context: app.models[modelName] });
  const updateModel = Promise.promisify(app.models[modelName].updateAll, { context: app.models[modelName] });
  const destroyModels = Promise.promisify(app.models[modelName].destroyAll, { context: app.models[modelName] });

  const toUpdate = [];
  const toCreate = [];
  const toDelete = [];

  const currentIds = [];
  const newIds = [];

  return new Promise((resolve, reject) => {
    findModels({ where: { deleted: false } }) // get all current
    .then(currentData => {
      _.forEach(currentData, currentInstance => {
        currentIds.push(currentInstance.idFromSource);
      });
      _.forEach(newFixtures, newFixture => {
        newIds.push(newFixture.idFromSource);
        if (currentIds.indexOf(newFixture.idFromSource) == -1) {
          toCreate.push(newFixture);
        } else {
          toUpdate.push(newFixture);
        }
      });

      _.forEach(currentData, currentInstance => {
        if (newIds.indexOf(currentInstance.idFromSource) == -1) {
          toDelete.push(currentInstance);
        }
      });
    })
    .then(() => {
      createTranslationsForModel(modelName, toCreate);
    })
    .then(() => {
      _.forEach(toUpdate, upd => {
        updateTranslationsForModel(modelName, upd, { idFromSource: upd.idFromSource });
      });
    })
    .then(() => {
      _.forEach(toDelete, del => {
        if (soft) {
          updateModel({ idFromSource: del.idFromSource }, { deleted: true, lastModified: Date.now() });
        } else {
          destroyModels({ idFromSource: del.idFromSource });
        }
      });
    })
    .then(() => {
      resolve();
    })
    .catch(err => {
      console.log('Error happened');
      reject(err);
    });
  });
}

/* EI VAIKUTA TOIMIVALTA! */
export function deleteTranslationsForModel(modelName, instanceId) {
  const TranslationModel = app.models.Translation;
  //const findTranslations = Promise.promisify(TranslationModel.find, { context: TranslationModel });
  const model = app.models[modelName];
  const findModelById = Promise.promisify(model.find, { context: model });

/* EI VAIKUTA TOIMIVALTA! */
  return new Promise((resolve, reject) => {
    findModelById({ 'id': instanceId })
    .then(modelInstance => {
      _.forEach(modelInstance, (value, key) => {
        if (isUUID(value)) {
          TranslationModel.destroyAll({ 'guId': value });
        }
      });
    })
    .then(() => {
      model.destroyById(instanceId);
      resolve(true);
    })
    .catch(err => reject(err));
  });
}
