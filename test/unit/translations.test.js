import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as translationUtils from '../../src/common/utils/translations';
import * as testUtils from '../utils/testutils';
import { resetDatabase } from '../../scripts/seed-database';
import Promise from 'bluebird';

chai.use(chaiAsPromised);

const expect = chai.expect;

const LocationCategory = app.models.LocationCategory;
const Location = app.models.Location;

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

  });

  describe('find', () => {
    const modelsToDelete = [];

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

  });

  describe('update', () => {
    const updateFixture = {
      name: {
        FI: 'FI_LOC2',
        EN: 'EN_LOC2',
        SV: 'SV_LOC2',
      },
      description: {
        FI: 'FI_DES2',
        SV: 'SV_DES2',
        EN: 'EN_DES2',
      },
      gridLatitude: 'X',
      gridLongitude: '10',
      imageUrl: 'http://roihu2016.fi/sites/default/files/roihu_valk_rgb_web.png',
    };

    beforeEach(done => {
      resetDatabase()
      .then(() => translationUtils.createTranslationsForModel('Location', [
        {
          name: {
            FI: 'FI_LOC1',
            SV: 'SV_LOC1',
            EN: 'EN_LOC1',
          },
          description: {
            FI: 'FI_DES1',
            SV: 'SV_DES1',
            EN: 'EN_DES1',
          },
          sortNo: 8888,
          idFromSource: 8888,
          categoryId: 10,
          gpsLatitude: 62.343434,
          gpsLongitude: 25.454545,
          gridLatitude: 'H',
          gridLongitude: '08',
          imageUrl: 'http://roihu2016.fi/sites/default/files/roihu_valk_rgb_web.png',
        },
        {
          name: {
            FI: 'FI_LOC11',
            SV: 'SV_LOC11',
            EN: 'EN_LOC11',
          },
          description: {
            FI: 'FI_DES11',
            SV: 'SV_DES11',
            EN: 'EN_DES11',
          },
          sortNo: 1234,
          idFromSource: 1234,
          categoryId: 11,
          gpsLatitude: 1,
          gpsLongitude: 1,
          gridLatitude: 'x',
          gridLongitude: '11',
          imageUrl: 'http://roihu2016.fi/sites/default/files/roihu_valk_rgb_web.png',
        },
      ])).nodeify(done);
    });

    it('should update translations', done => {
      translationUtils.updateTranslationsForModel('Location', updateFixture, { idFromSource: 8888 })
      .then(() => {

        const test_FI = translationUtils.getTranslationsForModel(Location, 'FI', { where: { idFromSource: 8888 } })
        .then(location => {
          location = location[0];
          expect(location.name).to.equal('FI_LOC2');
          expect(location.description).to.equal('FI_DES2');

          expect(location.gridLatitude).to.equal('X');
          expect(location.gridLongitude).to.equal('10');
          expect(location.imageUrl).to.equal('http://roihu2016.fi/sites/default/files/roihu_valk_rgb_web.png');
          return Promise.resolve();
        });

        const test_SV = translationUtils.getTranslationsForModel(Location, 'SV', { where: { idFromSource: 8888 } })
        .then(location => {
          location = location[0];
          expect(location.name).to.equal('SV_LOC2');
          expect(location.description).to.equal('SV_DES2');
          return Promise.resolve();
        });

        const test_EN = translationUtils.getTranslationsForModel(Location, 'EN', { where: { idFromSource: 8888 } })
        .then(location => {
          location = location[0];
          expect(location.name).to.equal('EN_LOC2');
          expect(location.description).to.equal('EN_DES2');
          return Promise.resolve();
        });

        return Promise.join(test_FI, test_SV, test_EN);
      }).nodeify(done);
    });
  });
});
