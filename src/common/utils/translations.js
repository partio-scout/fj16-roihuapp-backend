import app from '../../server/server'; // relative to file which does the import...
import Promise from 'bluebird';
import _ from 'lodash';
import validate_uuid from 'uuid-validate';

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
            if (isUUID(value)) {
              const asd =  getTranslation(lang, value)
                .then(tr => {
                  translatedInstance[key] = tr.text;
                  return translatedInstance[key];
                });
              promises.push(asd);
              allPromises.push(asd);
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

  function isUUID(text) {
    return (validate_uuid(text, 1) || validate_uuid(text, 4)) ? 1 : 0;
  }

  function getTranslation(lang, guid) {

    return findTranslation({ where: {
      and: [
        { guId: guid },
        { lang: lang },
      ] } });
  }
}

export function langExists(lang) {
  const TranslationModel = app.models.Translation;
  const countTranslation = Promise.promisify(TranslationModel.count, { context: TranslationModel });

  return countTranslation({ where: { lang: lang } })
    .then(count => ( count == 0 ) ? 0 : 1);

}
