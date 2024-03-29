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
const ApiUser = app.models.ApiUser;

const testUser = {
  lastModified: new Date(),
  lastname: 'Spurdonte',
  firstname: 'Luigi',
  email: 'luigi.spurdontf@example.org',
  username: 'luigispurdonte',
  password: 'letmein',
  memberNumber: '12345',
  ageGroup: 'Samoajat',
};

const testUser2 = {
  lastModified: new Date(),
  lastname: 'x',
  firstname: 'x',
  email: 'qwe@rty.ui',
  password: 'nopass',
  memberNumber: '100',
};

describe('ApiUser', () => {

  describe('login', () => {
    let userId;

    before(() =>
      ApiUser.create(testUser).then(user => userId = user.id)
    );

    it('lets in with correct credentials', () => {
      request(app).post('/api/ApiUsers/login')
        .send({
          'email': 'luigi.spurdonte@example.org',
          'password': 'letmein',
        })
        .expect(200);
    });

    it('won\'t let in with invalid credentials', () => {
      request(app).post('/api/ApiUsers/login')
        .send({
          'email': 'luigi.spurdonte@example.org',
          'password': 'dontlemein',
        })
        .expect(401);
    });

    after(() => ApiUser.destroyById(userId));
  });

  describe('completed achievements', () => {
    let User;
    let achId;

    before(done => {
      const p1 = ApiUser.create(testUser).then(user => User = user);

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
      request(app).get(`/api/ApiUsers/${User.id}/completedAchievements?lang=FI`)
      .expect(200)
      .expect(res => {
        expect(res.body).to.deep.have.property('completedAchievements.[0].description', 'Melonta on jännempää yöllä');
        expect(res.body).to.deep.have.property('completedAchievements.[0].name', 'Yömelonta');
      });
    });

    after(() => {
      testUtils.deleteFixtureIfExists('ApiUser', User.id || 9999);
      testUtils.deleteFixtureIfExists('Achievement', achId || 9999);
    });
  });

  describe('unathorized user should not allow', () => {
    before(done => resetDatabase()
      .then(() => testUtils.createFixture('ApiUser', testUser))
      .then(() => done()));

    it('find: ApiUser', () => testUtils.get('/api/ApiUsers').expect(401));
    it('findById: ApiUser', () => testUtils.get('/api/ApiUsers/1').expect(401));
    it('findOne: ApiUser', () => testUtils.get('/api/ApiUsers/findOne').expect(401));
    it('exists: ApiUser', () => testUtils.get('/api/ApiUsers/1/exists').expect(401));
    it('create: ApiUser', () => testUtils.post('/api/ApiUsers/', testUser2).expect(401));
    it('find: Achievements', () => testUtils.get('/api/ApiUsers/1/achievements').expect(401));
    it('find: CompletedAchievements', () => testUtils.get('/api/ApiUsers/1/completedachievements').expect(401));
    it('find: Calendar', () => testUtils.get('/api/ApiUsers/1/Calendar').expect(401));
    it('find: CalendarEvents', () => testUtils.get('/api/ApiUsers/1/CalendarEvents').expect(401));

    it('get user through achievement', () => testUtils.get('/api/achievements?filter[include]=usersCompleted').expect(401));
    it('get user through achievementCategory', () => {
      const filter = {
        include: {
          relation: 'achievements',
          scope: {
            relation: 'usersCompleted',
          },
        },
      };
      testUtils.get(`/api/achievementCategories?filter=${filter}`).expect(401);
    });
    it('get user through CalendarEvent', () => testUtils.get('/api/CalendarEvents?filter[include]=usersInEvent').expect(401));

  });

  describe('authorized user should not allow', () => {
    let userId;
    let token;

    before(done => resetDatabase()
      .then(() => testUtils.createFixture('ApiUser', testUser))
      .then(() => testUtils.createFixture('ApiUser', testUser2))
      .then(user => {
        userId = user.id;
        testUtils.loginUser(testUser.username, testUser.password).then(at => {
          token = at;
          done();
        });
      })
    );

    it('find: ApiUser', () => testUtils.get(`/api/ApiUsers`, token).expect(401));
    it('findById: ApiUser', () => testUtils.get(`/api/ApiUsers/${userId}`, token).expect(401));
    it('findOne: ApiUser', () => testUtils.get(`/api/ApiUsers/findOne`, token).expect(401));
    it('exists: ApiUser', () => testUtils.get(`/api/ApiUsers/${userId}/exists`, token).expect(401));
    it('create: ApiUser', () => testUtils.post('/api/ApiUsers/', testUser2, token).expect(401));
    it('find: Achievements', () => testUtils.get(`/api/ApiUsers/${userId}/achievements`, token).expect(401));
    it('find: CompletedAchievements', () => testUtils.get(`/api/ApiUsers/${userId}/completedachievements`, token).expect(401));
    it('find: Calendar', () => testUtils.get(`/api/ApiUsers/${userId}/Calendar`, token).expect(401));
    it('find: CalendarEvents', () => testUtils.get(`/api/ApiUsers/${userId}/CalendarEvents`, token).expect(401));

    it('get user through achievement', () => testUtils.get('/api/achievements?filter[include]=usersCompleted', token).expect(401));
    it('get user through achievementCategory', () => {
      const filter = {
        include: {
          relation: 'achievements',
          scope: {
            relation: 'usersCompleted',
          },
        },
      };
      testUtils.get(`/api/achievementCategories?filter=${filter}`, token).expect(401);
    });
    it('get user through CalendarEvent', () => testUtils.get('/api/CalendarEvents?filter[include]=usersInEvent', token).expect(401));

    it('update own memberNumber', () => {
      testUtils.put('/api/ApiUsers/${userId}', { memberNumber: 987654 }, token)
      .expect(res => {
        testUtils.find('ApiUser', { id: userId })
        .then(userdata => {
          expect(userdata.memberNumber).to.eql(testUser.memberNumber);
        });
      });
    });
  });

  describe('Local translations', () => {
    let userId;
    let token;

    before(() => resetDatabase()
      .then(() => testUtils.createFixture('ApiUser', testUser))
      .then(user => {
        userId = user.id;
        return testUtils.loginUser(testUser.username, testUser.password).then(at => token = at.id );
      })
    );

    it('should give correct translation for ageGroup', () =>
      testUtils.get(`/api/ApiUsers/${userId}`, token)
      .expect(200)
      .expect(res => expect(res.body).to.have.property('ageGroup', 'Samoaja/Explorerscout/Explorer (15-17)'))
    );
  });
});
