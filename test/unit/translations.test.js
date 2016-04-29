import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as translationUtils from '../../src/common/utils/translations';

chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Translations', () => {
  describe('create', () => {
    const modelsToDelete = [];

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
        expect(translationUtils.isUUID(data.name)).to.be.true;
      }).nodeify(done);
    });

    after(() => {
      modelsToDelete.forEach(model => {
        translationUtils.deleteTranslationsForModel(model.name, model.id);
      });
    });
  });

  describe('find', () => {
    const modelsToDelete = [];
    const LocationCategory = app.models.LocationCategory;

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
        console.log(result);
        expect(result).to.not.be.null;
        expect(result.name).to.equal('markkinapaikat');
      }).nodeify(done);
    });

    after(() => {
      modelsToDelete.forEach(model => {
        translationUtils.deleteTranslationsForModel(model.name, model.id);
      });
    });
  });
});
