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
  'LocationCategory'
];

function isContinuingAllowed() {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmation',
      message: 'Are you sure?',
    },
  ]).then(answers => answers.confirmation);
}

function createTranslations() {
  inquirer.prompt([
    {
      type: 'list',
      name: 'modelName',
      message: 'Choose target model',
      choices: _.map(translateableModels, model => {
        return { name: model, value: model };
      }),
    },
    {
      type: 'editor',
      name: 'modelJSON',
      message: 'Paste translations json to editor.\nIf editor doesn\'t show, make sure that EDITOR env variable has your preferred editor in it.\nFor example EDITOR=nano',
    },
  ]).then(answers => {
    isContinuingAllowed()
    .then(ok => {
      if (ok) {
        // do stuff
      } else {
        console.log('Aborting');
        process.exit(0);
      }
    });
  });  
}

function deleteModels() {
  console.log('Not implemented yet');
  process.exit(0);
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
  ],
}]).then(answers => answers.operation());
