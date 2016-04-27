import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { locationsHandler } from '../../scripts/load-sharepoint';
import request from 'supertest';
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
    locationsHandler(null, locationsData, done);
  });

  it('translations should exitst after loading', done => {
    request(app).get('/api/LocationCategories/translations?lang=FI')
    .expect(200)
    .expect(res => {
      /* same as below
      expect(res.body).to.have.property('categories')
        .that.is.an('array')
        .with.deep.property('[0]')
          .that.have.property('articles')
          .that.is.an('array')
          .with.deep.property('[0]')
          .that.have.property('title', 'OTSIKKO_FI');
          */
      expect(res.body).to.deep.have.property('categories.[0].articles.[0].title', 'OTSIKKO_FI');
      expect(res.body).to.deep.have.property('categories.[0].articles.[0].bodytext', 'KUVAUS_FI');
      expect(res.body).to.deep.have.property('categories.[0].title', 'TESTI_KATEGORIA');
    })
    .end(done);

  });
});
