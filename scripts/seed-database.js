import path from 'path';
import Promise from 'bluebird';

import app from '../src/server/server';
import { getModelCreationList, getFixtureCreationList } from '../src/common/models-list';

function getFixtures(modelName) {
  return Promise.try(() => require(path.resolve(__dirname, `../src/common/fixtures/${modelName}`)));
}

function createFixtures(modelName) {
  const model = app.models[modelName];
  const createModel = Promise.promisify(model.create, { context: model });

  return getFixtures(modelName)
    .then(fixtureData => createModel(fixtureData)
      .then(() => console.log(`Created ${fixtureData.length} fixtures for model ${modelName}`)))
    .catch(err => console.error(`Fixture creation for model ${modelName} failed. ${err}`));
}

// Pikkukikka joka suorittaa promiseReturningFunctionin peräkkäin jokaiselle values-listan jäsenelle niin,
// että promiseReturningFunctioneja on vain yksi suorituksessa kerrallaan.
// Palauttaa tyhjän resolved-tilassa olevan promisen jos values-lista on tyhjä.
function forAll(values, promiseReturningFunction) {
  return values.reduce((cur, next) => cur.then(() => promiseReturningFunction(next)), Promise.resolve());
}

export function resetDatabase() {
  function automigrate() {
    const db = app.datasources.db;
    const modelsToCreate = getModelCreationList();
    return new Promise((resolve, reject) => db.automigrate(modelsToCreate).then(resolve, reject));
  }

  return automigrate()
    .then(() => forAll(getFixtureCreationList(), createFixtures));
}

// Ajetaan resetDatabase jos tiedosto ajetaan skriptinä, ei silloin kun importataan
// Tällöin suljetaan yhteys tietokantaan lopuksi
if (require.main === module) {
  const db = app.datasources.db;

  resetDatabase()
    .catch(err => console.error('Database reset and seeding failed: ', err))
    .finally(() => db.disconnect());
}
