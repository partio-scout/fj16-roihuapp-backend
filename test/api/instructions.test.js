import app from '../../src/server/server.js';
import request from 'supertest-as-promised';
import _ from 'lodash';
import Promise from 'bluebird';
import { resetDatabase } from '../../scripts/seed-database';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as testUtils from '../utils/testutils';

chai.use(chaiAsPromised);
const expect = chai.expect;

const Instruction = app.models.Instruction;
const InstructionCategory = app.models.InstructionCategory;
const createInstuction = Promise.promisify(Instruction.create, { context: Instruction });
const createInstuctionCategory = Promise.promisify(InstructionCategory.create, { context: InstructionCategory });
const langsToTest = ['FI', 'SV', 'EN'];

function createTestData() {
  return new Promise(resolve => {
    const allDone = [];
    _.forEach(langsToTest, lang => {
      allDone.push(createInstuctionCategory({
        name: `${lang} TESTIKATEGORIA`,
        sortNo: 0,
        lang: lang,
        lastModified: new Date(),
      })
      .then(category => createInstuction({
        categoryId: category.categoryId,
        sortNo: 0,
        lastModified: new Date(),
        name: `${lang} TESTIOHJE`,
        description: `${lang} TESTIOHJEEN TEKSTI`,
        lang: lang,
      })));
    });
    Promise.all(allDone).then(() => resolve());
  });
}

function testForLanguage(url, code, lang, done) {
  request(app).get(url)
  .query({ lang: lang })
  .expect(code)
  .expect(res => {
    expect(res.body).to.deep.have.property('categories.[0].title', `${lang} TESTIKATEGORIA`);
    expect(res.body).to.deep.have.property('categories.[0].articles.[0][0].title', `${lang} TESTIOHJE`);
    expect(res.body).to.deep.have.property('categories.[0].articles.[0][0].bodytext', `${lang} TESTIOHJEEN TEKSTI`);
  }).end(done);
}

describe('Instructions', () => {
  beforeEach(done => {
    resetDatabase()
    .then(() => createTestData())
    .then(() => done());
  });

  it('should give correct language FI', done => {
    testForLanguage('/api/InstructionCategories/Translations', 200, 'FI', done);
  });

  it('should give correct language EN', done => {
    testForLanguage('/api/InstructionCategories/Translations', 200, 'EN', done);
  });

  it('should give correct language SV', done => {
    testForLanguage('/api/InstructionCategories/Translations', 200, 'SV', done);
  });

  it('should allow get Instructions', () => testUtils.get('/api/InstructionCategories/Translations').expect(200));

});
