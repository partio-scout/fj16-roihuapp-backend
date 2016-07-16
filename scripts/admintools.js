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

function askForTranslateableModelName() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'modelName',
      message: 'Choose target model',
      choices: _.map(translateableModels, model => ({ name: model, value: model })),
    }
  ]).then(answers => answers.modelName);
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

function editTranslations() {
  askForTranslateableModelName
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
    { name: 'editTranslations', value: editTranslations },
  ],
}]).then(answers => answers.operation());
