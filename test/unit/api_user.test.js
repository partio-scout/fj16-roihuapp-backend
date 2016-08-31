import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

const expect = chai.expect;
const ApiUser = app.models.ApiUser;

describe('ApiUser', () => {

  describe('findByMemberNumber', () => {
    let userId;

    before(() =>
      ApiUser.create({
        lastModified: new Date(),
        lastname: 'Spurdonte',
        firstname: 'Luigi',
        email: 'luigi.spurdonte@example.org',
        password: 'letmein',
        memberNumber: '12345',
      }).then(user => userId = user.id)
    );

    it('returns correct user by membernumber', () =>
      expect(ApiUser.findByMemberNumber('12345')).to.eventually.have.property('firstname', 'Luigi'));

    it('returns null when user is not found', () =>
      expect(ApiUser.findByMemberNumber('00404')).to.eventually.be.null);

    after(() => ApiUser.destroyById(userId));
  });

  describe('findWaveByVillage', () => {
    it('returns correct wave by village name', () =>
      expect(ApiUser.getVillageWave('Minttu')).to.equal('B'));

    it('returns A as default village name', () =>
      expect(ApiUser.getVillageWave('Mintti')).to.equal('A'));
  });

});
