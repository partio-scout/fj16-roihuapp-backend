import app from '../../server/server'; // relative to file which does the import...
import Promise from 'bluebird';
import _ from 'lodash';
import uuid from 'uuid';
import validate_uuid from 'uuid-validate';

export function getTranslationsForModel(model, lang) {
  const TranslationModel = app.models.Translation;
  const findTranslation = Promise.promisify(TranslationModel.findOne, { context: TranslationModel });
  const findModel = Promise.promisify(model.find, { context: model });

  return new Promise((resolve, reject) => {
    var allPromises = [];
    var allTranslated = [];
    findModel()
      .then(instances => {
        _.forEach(instances, (instance) => {
          var translatedInstance = {};
          var promises = [];
          _.forEach(instance.__data, function(value, key) {
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
//korjaa tää niin että se palauttaa jotakin...
        
        Promise.all(promises)
          .then(() => {
            console.log(translatedInstance);
            allTranslated.push(translatedInstance);
          });
        });
        console.log('AT', allTranslated);
      });
  });

  function isUUID(text) {
    return (validate_uuid(text, 1) || validate_uuid(text, 4)) ? 1 : 0;
  }

  function getTranslation(lang, guid) {
    
    return findTranslation({ where: {
      and: [
        { guId: guid },
        { lang: lang }
      ] } });
  }

  function promiseFieldCrearText(lang, currentValue) {
    return new Promise((resolve) => {
      if(isUUID(currentValue)) resolve(getTranslation(lang, currentValue).value.text);
      else resolve(currentValue);
    })
  }

}
    
