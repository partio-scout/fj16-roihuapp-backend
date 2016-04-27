import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sharepointLoader from '../../scripts/load-sharepoint';
import request from 'supertest';
//import Promise from 'bluebird';
//import { resetDatabase } from '../../scripts/seed-database';

chai.use(chaiAsPromised);

const expect = chai.expect;
const locationsData = require('./sharepoint-locationsdata.json');
//const LocationCategory = app.models.LocationCategory;
//const getLocationTranslations = Promise.promisify(LocationCategory.FindTranslations);

describe('Sharepoint loading', () => {
  describe('functions', () => {
    before(done => {
      // handle sharepoint data without actually getting it from sharepoint
      // resetDatabase() ???
      sharepointLoader.locationsHandler(null, locationsData, done);
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

  describe('error handling', () => {
    describe('missing credentials', () => {
      before(() => {
        process.env.SHAREPOINT_USER = '';
        process.env.SHAREPOINT_PSW = '';
      });

      it('should not throw unhandled error', done => {
        sharepointLoader.readSharepointList('Paikat', (err, data) => {
          expect(data).to.be.null;
          expect(err).to.not.be.null;
          done();
        });
      });
    });

    describe('invalid credentials', () => {
      before(() => {
        process.env.SHAREPOINT_USER = 'ville.vallaton@omaposti.fi';
        process.env.SHAREPOINT_PSW = 'letmein';
      });

      it('should not throw unhandled error', done => {
        sharepointLoader.readSharepointList('Paikat', (err, data) => {
          expect(data).to.be.null;
          expect(err).to.not.be.null;
          done();
        });
      });
    });
  });
});
