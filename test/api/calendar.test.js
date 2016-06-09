import app from '../../src/server/server.js';
import request from 'supertest-as-promised';
import * as translationUtils from '../../src/common/utils/translations';
import * as testUtils from '../utils/testutils';
import Promise from 'bluebird';

const RoihuUser = app.models.RoihuUser;

describe('Calendar', () => {
  describe('Unauthenticated user', () => {
    it('should not get others calendars', () => {
      request(app).get(`/api/RoihuUsers/1/calendar?lang=FI`)
      .expect(401);
    });

    it('should not allow to add events to calendars', () => {
      request(app).put(`/api/RoihuUsers/1/calendar/rel/1`)
      .expect(401);
    });
  });

  describe('Authenticated user', () => {
    let User;
    let User2Id;
    let evtId;

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

      const p3 = translationUtils.createTranslationsForModel('CalendarEvent', {
        name: {
          FI: 'FI_EVENT',
          SV: 'SV_EVENT',
          EN: 'EN_EVENT',
        },
        description: {
          FI: '',
          SV: '',
          EN: '',
        },
        type: 'TEST',
        locationName: {
          FI: 'test',
          SV: 'test',
          EN: 'test',
        },
        status: 'searchable',
        startTime: Date.now(),
        endTime: Date.now(),
        subcamp: 'Unity',
        camptroop: 'test-troop',
        ageGroups: 'Samoajat',
        wave: 'A',
        source: 1,
      }).then(models => evtId = models[0].eventId);

      Promise.join(p1, p2, p3, () => {
        done();
      });
    });

    it('should get own calendar', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).get(`/api/RoihuUsers/${User.id}/calendar?lang=FI`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should not get others calendars', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).get(`/api/RoihuUsers/${User2Id}/calendar?lang=FI`)
        .query({ access_token: token.id })
        .expect(401);
      });
    });

    it('should allow to add event to calendar', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).put(`/api/RoihuUsers/${User.id}/calendar/rel/${evtId}`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should allow to remove event from calendar', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).delete(`/api/RoihuUsers/${User.id}/calendar/rel/${evtId}`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should not allow to add events to others calendars', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).put(`/api/RoihuUsers/${User2Id}/calendar/rel/${evtId}`)
        .query({ access_token: token.id })
        .expect(401);
      });
    });
  });
});
