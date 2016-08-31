import path from 'path';
import Promise from 'bluebird';
import app from '../src/server/server.js';
import _ from 'lodash';
import uuid from 'uuid';

const TranslationModel = app.models.Translation;
const createTranslation = Promise.promisify(TranslationModel.create, { context: TranslationModel });

/* Put here model names what you want to translate automatically
 * Order of models matters!!!
 */
const translateableList = [
  'AchievementCategory',
  'Achievement',
  'LocationCategory',
  'Location',
];

// Model fixtures not needing translation
const notTranslateableList = [

];

function getTranslations(modelName) {
  return Promise.try(() => require(path.resolve(__dirname, `./fixtures/${modelName}`)));
}

function createTranslationsForModel(modelName) {
  const model = app.models[modelName];
  const createModel = Promise.promisify(model.create, { context: model });

  return getTranslations(modelName)
    .then(modelData => {
      _.forEach(modelData, fixture => {
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
          .catch(err => console.error(`Failed to create translations for model ${ modelName }: `, err));
      });

    });
}

function createFixturesForModel(modelName) {

}

// Pikkukikka joka suorittaa promiseReturningFunctionin peräkkäin jokaiselle values-listan jäsenelle niin,
// että promiseReturningFunctioneja on vain yksi suorituksessa kerrallaan.
// Palauttaa tyhjän resolved-tilassa olevan promisen jos values-lista on tyhjä.
// kopioitu leirireksteristä
function forAll(values, promiseReturningFunction) {
  return values.reduce((cur, next) => cur.then(() => promiseReturningFunction(next)), Promise.resolve());
}

export function createTranslations() {
  return forAll(translateableList, createTranslationsForModel);
}

export function createModels() {
  return forAll(notTranslateableList, createFixturesForModel);
}

if (require.main === module) {
  createTranslations()
  .catch(err => console.error('Failed to create translations: ', err));

  createModels()
  .catch(err => console.error('Failed to create models: ', err));
}
