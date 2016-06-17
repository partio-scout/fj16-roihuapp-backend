import path from 'path';
import Promise from 'bluebird';
import app from '../src/server/server.js';
import _ from 'lodash';
import uuid from 'uuid';

const TranslationModel = app.models.Translation;
const createTranslation = Promise.promisify(TranslationModel.create, {context: TranslationModel});

/* Put here model names what you want to translate automatically
 * Order of models matters!!!
 */
const translateableList = [
  'AchievementCategory',
  'Achievement',
  'LocationCategory',
  'Location'
];

function getTranslations(modelName) {
	return Promise.try(() => require(path.resolve(__dirname, `./translations_to_create/${modelName}`)));
}

function createTranslationsForModel(modelName) {
	const model = app.models[modelName];
	const createModel = Promise.promisify(model.create, {context: model});

	return getTranslations(modelName)
		.then(modelData => {
				_.forEach(modelData, function(fixture) {
					var modelJSON = {
            "lastModified": Date.now(),   // automatically set lastModified
          };
					var translations = [];

					_.forEach(fixture, function(value, key) {
						if(typeof value === 'object') {
							// generate model JSON with uuids in case of translation
							var textUuid = uuid.v1();
							modelJSON[key] = textUuid;

							// add translations too
							_.forEach(value, function(text, lang) {
								translations.push({
									"lang": lang,
									"text": text,
									"guId": textUuid,
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

if (require.main === module) {
	createTranslations()
		.catch(err => console.error('Failed to create translations: ', err));
}
