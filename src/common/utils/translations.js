import app from '../../server/server'; // relative to file which does the import...
import Promise from 'bluebird';
import _ from 'lodash';
import validate_uuid from 'uuid-validate';
import uuid from 'uuid';

export function getTranslationsForModel(model, lang, filter) {
  const TranslationModel = app.models.Translation;
  const findTranslation = Promise.promisify(TranslationModel.findOne, { context: TranslationModel });
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
                  translatedInstance[key] = tr.text;
                  return translatedInstance[key];
                });
              promises.push(promiseOfTranslation);
              allPromises.push(promiseOfTranslation);
            }
          });

          return Promise.all(promises)
            .then(() => {
              // push single translated instace to completed list
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
      });
  });

  function getTranslation(lang, guid) {

    return findTranslation({ where: {
      and: [
        { guId: guid },
        { lang: lang },
      ] } });
  }
}

export function isUUID(text) {
  return (validate_uuid(text, 1) || validate_uuid(text, 4)) ? true : false;
}

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

    _.forEach(jsonData, fixture => {
      const modelJSON = {
        'lastModified': Date.now(),   // automatically set lastModified
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
      .then(createTranslation(translations))
      .then(newModel => resolve(newModel))
      .catch(err => reject(err));
    });
  });
}

export function deleteTranslationsForModel(modelName, instanceId) {
  const TranslationModel = app.models.Translation;
  //const findTranslations = Promise.promisify(TranslationModel.find, { context: TranslationModel });
  const model = app.models[modelName];
  const findModelById = Promise.promisify(model.find, { context: model });
  console.log('id', instanceId);
  findModelById({ 'id': instanceId })
  .then(modelInstance => {
    console.log('M', modelInstance);
    _.forEach(modelInstance, (value, key) => {
      if (isUUID(value)) {
        TranslationModel.destroyAll({ 'guId': value });
      }
    });
    model.destroyById(instanceId);
  })
  //.then(() => model.destroyById(instanceId))
  .catch(err => console.log(err));
}
