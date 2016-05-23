import app from '../../src/server/server.js';
import request from 'supertest-as-promised';
import * as translationUtils from '../../src/common/utils/translations';
import * as testUtils from '../utils/testutils';
//import chai from 'chai';
//import chaiAsPromised from 'chai-as-promised';
import Promise from 'bluebird';

//chai.use(chaiAsPromised);

//const expect = chai.expect;
const RoihuUser = app.models.RoihuUser;

describe('Achievement', () => {

  describe('Unauthenticated user', () => {
    it('should not get others completed achievements', () => {
      request(app).get(`/api/RoihuUsers/1/completedAchievements?lang=FI`)
      .expect(401);
    });

    it('should not allow to mark others achievement completed', () => {
      request(app).put(`/api/RoihuUsers/1/achievements/rel/1`)
      .expect(401);
    });
  });

  describe('Authenticated user', () => {
    let User;
    let User2Id;
    let achId;

    before(done => {
      const p1 = RoihuUser.create({
        lastModified: new Date(),
        lastname: 'Spurdonte',
        firstname: 'Luigi',
        email: 'luigi.spurdontg@example.org',
        password: 'letmein',
        memberNumber: '12345',
        username: 'letmein',
      }).then(user => User = user);

      const p2 = RoihuUser.create({
        lastModified: new Date(),
        lastname: 'x',
        firstname: 'y',
        email: 'a.b@example.org',
        password: 'z',
        memberNumber: '112',
      }).then(user => User2Id = user.id);

      const p3 = translationUtils.createTranslationsForModel('Achievement', {
        'name': {
          'FI': 'Yömelonta',
          'SV': 'SV Yömelonta',
          'EN': 'EN Yömelonta',
        },
        'description': {
          'FI': 'Melonta on jännempää yöllä',
          'SV': 'SV Melonta on jännempää yöllä',
          'EN': 'EN Melonta on jännempää yöllä',
        },
        'sortNo': 9999,
        'idFromSource': 9999,
        'categoryId': 10,
        'achievementCount': 1,
      }).then(models => achId = models[0].achievementId);

      Promise.join(p1, p2, p3, () => {
        done();
      });
    });

    it('should get own completed achievements', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).get(`/api/RoihuUsers/${User.id}/completedAchievements?lang=FI`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should not get others completed achievements', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).get(`/api/RoihuUsers/${User2Id}/completedAchievements?lang=FI`)
        .query({ access_token: token.id })
        .expect(401);
      });
    });

    it('should allow to mark achievement completed', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).put(`/api/RoihuUsers/${User.id}/achievements/rel/${achId}`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should allow to mark achievement not completed', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).delete(`/api/RoihuUsers/${User.id}/achievements/rel/${achId}`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should not allow to mark others achievement completed', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).put(`/api/RoihuUsers/${User2Id}/achievements/rel/${achId}`)
        .query({ access_token: token.id })
        .expect(401);
      });
    });

    after(() => {
      testUtils.deleteFixtureIfExists('RoihuUser', User.id || 9999);
      testUtils.deleteFixtureIfExists('RoihuUser', User2Id || 9999);
      testUtils.deleteFixtureIfExists('Achievement', achId || 9999);
    });
  });

});
