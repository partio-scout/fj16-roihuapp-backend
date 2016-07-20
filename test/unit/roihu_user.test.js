import app from '../../src/server/server.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

const expect = chai.expect;
const RoihuUser = app.models.RoihuUser;

describe('RoihuUser', () => {

  describe('findByMemberNumber', () => {
    let userId;

    before(() =>
      RoihuUser.create({
        lastModified: new Date(),
        lastname: 'Spurdonte',
        firstname: 'Luigi',
        email: 'luigi.spurdonte@example.org',
        password: 'letmein',
        memberNumber: '12345',
      }).then(user => userId = user.id)
    );

    it('returns correct user by membernumber', () =>
      expect(RoihuUser.findByMemberNumber('12345')).to.eventually.have.property('firstname', 'Luigi'));

    it('returns null when user is not found', () =>
      expect(RoihuUser.findByMemberNumber('00404')).to.eventually.be.null);

    after(() => RoihuUser.destroyById(userId));
  });

  describe('findWaveByVillage', () => {
    it('returns correct wave by village name', () =>
      expect(RoihuUser.getVillageWave('Minttu')).to.equal('B'));

    it('returns A as default village name', () =>
      expect(RoihuUser.getVillageWave('Mintti')).to.equal('A'));
  });

});
