import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { locationsHandler } from '../../scripts/load-sharepoint';
import request from 'supertest-as-promised';
//import Promise from 'bluebird';
//import { resetDatabase } from '../../scripts/seed-database';

chai.use(chaiAsPromised);

const expect = chai.expect;
const locationsData = require('./sharepoint-locationsdata.json');
//const LocationCategory = app.models.LocationCategory;
//const getLocationTranslations = Promise.promisify(LocationCategory.FindTranslations);

describe('Sharepoint loading', () => {

  before(done => {
    // handle sharepoint data without actually getting it from sharepoint
    // resetDatabase() ???
    locationsHandler(null, locationsData).then(done());
  });

  it('translations should exitst after loading', () => {
    request(app).get('/api/LocationCategories/translations?lang=FI')
    .then(response => {
      // THIS SHOULD FAIL
      console.log(response);
      expect(response).to.not.exist;
      expect(response).to.exist;
    });
  });
});
