import app from '../src/server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import * as translationUtils from '../src/common/utils/translations';

export function instructionsHandler(jsonData, cb) {
  // cb is for tests

  console.log(jsonData);

}

export function loadInstructions(handler) {

}

if (require.main === module) {
  loadInstructions(instructionsHandler);
}
