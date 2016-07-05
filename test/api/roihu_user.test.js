import app from '../../src/server/server.js';
import request from 'supertest-as-promised';
import * as translationUtils from '../../src/common/utils/translations';
import * as testUtils from '../utils/testutils';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Promise from 'bluebird';
import { resetDatabase } from '../../scripts/seed-database';

chai.use(chaiAsPromised);

const expect = chai.expect;
const RoihuUser = app.models.RoihuUser;

const testUser = {
  lastModified: new Date(),
  lastname: 'Spurdonte',
  firstname: 'Luigi',
  email: 'luigi.spurdontf@example.org',
  username: 'luigispurdonte',
  password: 'letmein',
  memberNumber: '12345',
};

const testUser2 = {
  lastModified: new Date(),
  lastname: 'x',
  firstname: 'x',
  email: 'qwe@rty.ui',
  password: 'nopass',
  memberNumber: '100',
};

describe('RoihuUser', () => {

  describe('login', () => {
    let userId;

    before(() =>
      RoihuUser.create(testUser).then(user => userId = user.id)
    );

    it('lets in with correct credentials', () => {
      request(app).post('/api/RoihuUsers/login')
        .send({
          'email': 'luigi.spurdonte@example.org',
          'password': 'letmein',
        })
        .expect(200);
    });

    it('won\'t let in with invalid credentials', () => {
      request(app).post('/api/RoihuUsers/login')
        .send({
          'email': 'luigi.spurdonte@example.org',
          'password': 'dontlemein',
        })
        .expect(401);
    });

    after(() => RoihuUser.destroyById(userId));
  });

  describe('completed achievements', () => {
    let User;
    let achId;

    before(done => {
      const p1 = RoihuUser.create(testUser).then(user => User = user);

      const p2 = translationUtils.createTranslationsForModel('Achievement', {
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

      Promise.join(p1, p2, () => {
        User.achievements.add({ id: User.id, fk: achId }, () => done());
      });
    });

    it('completed achievements shoud be translated', () => {
      request(app).get(`/api/RoihuUsers/${User.id}/completedAchievements?lang=FI`)
      .expect(200)
      .expect(res => {
        expect(res.body).to.deep.have.property('completedAchievements.[0].description', 'Melonta on jännempää yöllä');
        expect(res.body).to.deep.have.property('completedAchievements.[0].name', 'Yömelonta');
      });
    });

    after(() => {
      testUtils.deleteFixtureIfExists('RoihuUser', User.id || 9999);
      testUtils.deleteFixtureIfExists('Achievement', achId || 9999);
    });
  });

  describe('unathorized user should not allow', () => {
    before(done => resetDatabase()
      .then(() => testUtils.createFixture('RoihuUser', testUser))
      .then(() => done()));

    it('find: RoihuUser', () => testUtils.get('/api/RoihuUsers').expect(401));
    it('findById: RoihuUser', () => testUtils.get('/api/RoihuUsers/1').expect(401));
    it('findOne: RoihuUser', () => testUtils.get('/api/RoihuUsers/findOne').expect(401));
    it('exists: RoihuUser', () => testUtils.get('/api/RoihuUsers/1/exists').expect(401));
    it('find: Achievements', () => testUtils.get('/api/RoihuUsers/1/achievements').expect(401));
    it('find: CompletedAchievements', () => testUtils.get('/api/RoihuUsers/1/completedachievements').expect(401));
    it('find: Calendar', () => testUtils.get('/api/RoihuUsers/1/Calendar').expect(401));
    it('find: CalendarEvents', () => testUtils.get('/api/RoihuUsers/1/CalendarEvents').expect(401));

  });

  describe('authorized user should not allow', () => {
    let userId;
    let token;

    before(done => resetDatabase()
      .then(() => testUtils.createFixture('RoihuUser', testUser))
      .then(() => testUtils.createFixture('RoihuUser', testUser2))
      .then(user => {
        userId = user.id;
        testUtils.loginUser(testUser.username, testUser.password).then(at => {
          token = at;
          done();
        });
      })
    );

    it('find: RoihuUser', () => testUtils.get(`/api/RoihuUsers`, token).expect(401));
    it('findById: RoihuUser', () => testUtils.get(`/api/RoihuUsers/${userId}`, token).expect(401));
    it('findOne: RoihuUser', () => testUtils.get(`/api/RoihuUsers/findOne`, token).expect(401));
    it('exists: RoihuUser', () => testUtils.get(`/api/RoihuUsers/${userId}/exists`, token).expect(401));
    it('find: Achievements', () => testUtils.get(`/api/RoihuUsers/${userId}/achievements`, token).expect(401));
    it('find: CompletedAchievements', () => testUtils.get(`/api/RoihuUsers/${userId}/completedachievements`, token).expect(401));
    it('find: Calendar', () => testUtils.get(`/api/RoihuUsers/${userId}/Calendar`, token).expect(401));
    it('find: CalendarEvents', () => testUtils.get(`/api/RoihuUsers/${userId}/CalendarEvents`, token).expect(401));
  });

});
