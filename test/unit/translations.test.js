import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as translationUtils from '../../src/common/utils/translations';
import * as testUtils from '../utils/testutils';
import { resetDatabase } from '../../scripts/seed-database';

chai.use(chaiAsPromised);

const expect = chai.expect;

function deleteModels(modelsToDelete) {
  modelsToDelete.forEach(model => {
    if (model.id && model.name) {
      testUtils.deleteFixtureIfExists(model.name, model.id);
    }
  });
}

describe('Translations', () => {
  describe('create', () => {
    const modelsToDelete = [];

    beforeEach(done => {
      resetDatabase().asCallback(done);
    });

    it('should add new translation', done => {
      translationUtils.createTranslationsForModel('LocationCategory', {
        'name': {
          'FI': 'Kahvilat',
          'SV': 'SV KATEGORIA',
          'EN': 'EN CATEGORY',
        },
        'sortNo': 99999,
        'idFromSource': 999,
      })
      .then(data => {
        modelsToDelete.push({ 'name': 'LocationCategory', 'id': data.categoryId });

        testUtils.find('LocationCategory', { id: data.categoryId })
        .then(item => {
          expect(translationUtils.isUUID(item[0].name)).to.be.true;
        });
      }).nodeify(done);
    });

    afterEach(() => {
      deleteModels(modelsToDelete);
    });
  });

  describe('find', () => {
    const modelsToDelete = [];
    const LocationCategory = app.models.LocationCategory;

    beforeEach(done => {
      resetDatabase().asCallback(done);
    });

    it('should get translated model', done => {
      translationUtils.createTranslationsForModel('LocationCategory', {
        'name': {
          'FI': 'markkinapaikat',
          'SV': 'SV KATEGORIA',
          'EN': 'EN CATEGORY',
        },
        'sortNo': 88888,
        'idFromSource': 8888,
      })
      .then(data => {
        modelsToDelete.push({ 'name': 'LocationCategory', 'id': data.categoryId });
      })
      .then(() => translationUtils.getTranslationsForModel(LocationCategory, 'FI'))
      .then(result => {
        result = result[0];

        expect(result).to.not.be.null;
        expect(result.name).to.equal('markkinapaikat');
      }).nodeify(done);
    });

    afterEach(() => {
      deleteModels(modelsToDelete);
    });
  });
});
