//import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as translationUtils from '../../src/common/utils/translations';
//import * as testUtils from '../utils/testutils';

chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Translations', () => {
  describe('create', () => {
    const locIds = [];

    it('should add new translation', () => {
      translationUtils.createTranslationsForModel('Location', {
        'name': {
          'FI': 'Testikäännös',
          'SV': 'SV TEST 1',
          'EN': 'TEST translation',
        },
        'description': {
          'FI': 'Kahvila 1 on auki seuraavasti...',
          'SV': 'SV Kahvila 1 on auki seuraavasti...',
          'EN': 'Opening hours of Coffee Shop 1 are...',
        },
        'sortNo': 99999,
        'idFromSource': 99999,
        'categoryId': 10,
        'gpsLatitude': '62.343434',
        'gpsLongitude': '25.454545',
        'gridLatitude': 'H',
        'gridLongitude': '08',
      })
      .then(data => {
        locIds.push(data.locationId);
        expect(translationUtils.isUUID(data.name)).to.be.true;
        expect(translationUtils.isUUID(data.description)).to.be.true;
      });
    });

    after(() => {
      translationUtils.deleteTranslationsForModel('Location', locIds[0]);
    });
  });

/*
  describe('delete', () => {
    let idToDelete;
    before(() => {
      translationUtils.createTranslationsForModel('Location', {
        'name': {
          'FI': 'Testikäännös',
          'SV': 'SV TEST 1',
          'EN': 'TEST translation',
        },
        'description': {
          'FI': 'Kahvila 1 on auki seuraavasti...',
          'SV': 'SV Kahvila 1 on auki seuraavasti...',
          'EN': 'Opening hours of Coffee Shop 1 are...',
        },
        'sortNo': 99998,
        'idFromSource': 99998,
        'categoryId': 10,
        'gpsLatitude': '62.343434',
        'gpsLongitude': '25.454545',
        'gridLatitude': 'H',
        'gridLongitude': '08',
      })
      .then(loc => idToDelete = loc.locationId);
    });

    it('should delete translation', () => {
      translationUtils.deleteTranslationsForModel('Location', idToDelete)
      .then(value => {
        expect(value).to.be.true;
      });
    });
  });
*/
});
