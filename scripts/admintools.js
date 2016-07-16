import Promise from 'bluebird';
import app from '../src/server/server.js';
import inquirer from 'inquirer';
import _ from 'lodash';
import * as translationUtils from '../src/common/utils/translations';

const models = _.keys(app.models);
const translateableModels = [
  'CalendarEvent',
  'Location',
  'Achievement',
  'AchievementCategory',
  'LocationCategory',
];

function getPropertyQuestions(modelName) {
  return _.map(app.models[modelName].definition.properties, (settings, propertyName) => ({
    type: 'input',
    name: propertyName,
    message: `${propertyName}\n required: ${settings.required || false}\n generated: ${settings.generated || false}\n > `,
  }));
}

function getEditQuestions(modelInstance) {
  return _.map(modelInstance.__data, (value, key) => ({
    type: 'input',
    name: key,
    message: `${key}: "${value}" (current) >`,
  }));
}

function findModelById(modelName, id) {
  const findById = Promise.promisify(app.models[modelName].findById, { context: app.models[modelName] });
  return findById(id);
}

function createNewModel(modelName, data) {
  const createM = Promise.promisify(app.models[modelName].create, { context: app.models[modelName] });
  return createM(data);
}

function askForConfirmation(infoMsg) {
  console.log(infoMsg);
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmation',
      message: 'Are you sure?',
    },
  ]).then(answers => answers.confirmation);
}

function askForModelName(modelNames) {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'modelName',
      message: 'Choose target model',
      choices: _.map(modelNames, model => ({ name: model, value: model })),
    },
  ]).then(answers => answers.modelName);
}

function askForInput(message) {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message: message,
    },
  ]).then(answers => answers.value);
}

function createTranslations() {
  inquirer.prompt([
    {
      type: 'list',
      name: 'modelName',
      message: 'Choose target model',
      choices: _.map(translateableModels, model => ({ name: model, value: model })),
    },
    {
      type: 'editor',
      name: 'modelJSON',
      message: 'Paste translations json to editor.\nIf editor doesn\'t show, make sure that EDITOR env variable has your preferred editor in it. For example EDITOR=nano',
    },
    {
      type: 'confirm',
      name: 'confirmation',
      message: 'Are you sure?',
    },
  ]).then(answers => {
    if (answers.confirmation) {
      return translationUtils.createTranslationsForModel(answers.modelName, JSON.parse(answers.modelJSON));
    } else {
      console.log('Aborting');
      process.exit(0);
    }
  }).asCallback((err, msq) => {
    if (err) console.error(err);
    console.log('done');
    process.exit(0);
  });

}

function deleteModels() {
  inquirer.prompt([
    {
      type: 'list',
      name: 'modelName',
      message: 'Choose target model',
      choices: models,
    },
    {
      type: 'input',
      name: 'where',
      message: 'Where filter ie { "userId": 3 }',
    },
  ]).then(answers => {
    const findModels = Promise.promisify(app.models[answers.modelName].find, { context: app.models[answers.modelName] });
    const deleteModels = Promise.promisify(app.models[answers.modelName].destroyAll, { context: app.models[answers.modelName] });
    const where = JSON.parse(answers.where);

    return findModels({ where: where })
    .then(models =>
      askForConfirmation(`About to delete ${models.length} instances of ${answers.modelName}`)
      .then(confirmation => {
        if (confirmation) {
          return deleteModels(where);
        } else {
          console.log('Aborting');
          return;
        }
      }));
  }).then(msg => {
    console.log('Deleted', msg.count, 'instances');
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

function createModel() {
  askForModelName(models)
  .then(modelName => inquirer.prompt(getPropertyQuestions(modelName))
    .then(answers => createNewModel(modelName, answers))
    .then(msg => {
      console.log(msg);
      process.exit(0);
    })
  )
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
}

function updateBasicModel() {
  let modelToEdit;

  askForModelName(_.filter(models, m => (translateableModels.indexOf(m) === -1)))
  .then(modelName => askForInput('Model id number:')
    .then(id => findModelById(modelName, id))
    .then(m => {
      modelToEdit = m;
      console.log('Do not edit id field if you dont know what you are doing!');
      console.log('If you dont want to edit field, write field current value as answer.');
      return inquirer.prompt(getEditQuestions(modelToEdit));
    })
    .then(answers => {
      console.log('Changing\n', modelToEdit, '\nto\n', answers);
      _.forEach(answers, (value, key) => {
        modelToEdit[key] = value;
      });
      return askForConfirmation()
      .then(confirmation => Promise.fromCallback(callback => {
        if (confirmation) {
          modelToEdit.save(callback);
        } else {
          callback();
        }
      }));
    })
  ).catch(e => console.log(e));
}

console.log('----------------------------');
console.log('--   Roihuapp admintools  --');
console.log('--    USE WITH OWN RISK   --');
console.log('----------------------------');

inquirer.prompt([{
  type: 'list',
  name: 'operation',
  message: 'Choose what to do',
  choices: [
    { name: 'createTranslations', value: createTranslations },
    { name: 'deleteModels', value: deleteModels },
    { name: 'createModel', value: createModel },
    { name: 'updateBasicModel', value: updateBasicModel },
  ],
}]).then(answers => answers.operation());
