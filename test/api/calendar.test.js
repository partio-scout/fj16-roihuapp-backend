import app from '../../src/server/server.js';
import request from 'supertest-as-promised';
import * as translationUtils from '../../src/common/utils/translations';
import * as testUtils from '../utils/testutils';
import Promise from 'bluebird';
import { resetDatabase } from '../../scripts/seed-database';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const expect = chai.expect;

const ApiUser = app.models.ApiUser;
const testEvent = {
  name: {
    FI: 'Autoajelu',
    SV: 'Bil',
    EN: 'Car trip',
  },
  description: {
    FI: 'Ajelu moottoriajoneuvolla',
    SV: 'Trip med motor thing',
    EN: 'roadtrip',
  },
  type: 'TEST',
  locationName: {
    FI: 'test_fi',
    SV: 'test_sv',
    EN: 'test_en',
  },
  status: 'searchable',
  startTime: Date.now(),
  endTime: Date.now(),
  subcamp: 'Unity',
  camptroop: 'test-troop',
  ageGroups: 'Samoajat',
  wave: 'A',
  source: 1,
};

describe('Calendar', () => {
  describe('Unauthenticated user', () => {
    it('should not get others calendars', () => {
      request(app).get(`/api/ApiUsers/1/calendar?lang=FI`)
      .expect(401);
    });

    it('should not allow to add events to calendars', () => {
      request(app).put(`/api/ApiUsers/1/calendar/rel/1`)
      .expect(401);
    });
  });

  describe('Authenticated user', () => {
    let User;
    let User2Id;
    let evtId;

    before(done => {
      const p1 = ApiUser.create({
        lastModified: new Date(),
        lastname: 'Spurdonte',
        firstname: 'Luigi',
        email: 'luigi.spurdontg@example.org',
        password: 'letmein',
        memberNumber: '12345',
        username: 'letmein',
      }).then(user => User = user);

      const p2 = ApiUser.create({
        lastModified: new Date(),
        lastname: 'x',
        firstname: 'y',
        email: 'a.b@example.org',
        password: 'z',
        memberNumber: '112',
      }).then(user => User2Id = user.id);

      const p3 = translationUtils.createTranslationsForModel('CalendarEvent', testEvent)
      .then(models => evtId = models[0].eventId);

      Promise.join(p1, p2, p3, () => {
        done();
      });
    });

    it('should get own calendar', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).get(`/api/ApiUsers/${User.id}/calendar?lang=FI`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should not get others calendars', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).get(`/api/ApiUsers/${User2Id}/calendar?lang=FI`)
        .query({ access_token: token.id })
        .expect(401);
      });
    });

    it('should allow to add event to calendar', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).put(`/api/ApiUsers/${User.id}/calendar/rel/${evtId}`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should allow to remove event from calendar', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).delete(`/api/ApiUsers/${User.id}/calendar/rel/${evtId}`)
        .query({ access_token: token.id })
        .expect(200);
      });
    });

    it('should not allow to add events to others calendars', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).put(`/api/ApiUsers/${User2Id}/calendar/rel/${evtId}`)
        .query({ access_token: token.id })
        .expect(401);
      });
    });

    it('should not allow to get all users in event', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).get(`/api/CalendarEvents/${evtId}/usersInEvent`)
        .query({ access_token: token.id })
        .expect(401);
      });
    });

    it('should not allow to get single user in event', () => {
      testUtils.withLoggedInUser('letmein', 'letmein', token => {
        request(app).get(`/api/CalendarEvents/${evtId}/usersInEvent/${User2Id}`)
        .query({ access_token: token.id })
        .expect(401);
      });
    });
  });

  describe('search calendarEvents', () => {

    before(done => {
      resetDatabase()
      .then(() => translationUtils.createTranslationsForModel('CalendarEvent', testEvent))
      .asCallback(done);
    });

    it('should allow get CalendarEvents without filter', () => {
      request(app).get('/api/calendarEvents/translations')
      .expect(200)
      .expect(res => expect(res.body.events).to.not.be.empty);
    });

    it('should give response when filter has possible results', () => {
      request(app).get('/api/calendarEvents/translations')
      .query({ filter: { where: { subcamp: 'Unity' } } })
      .expect(200)
      .expect(res => {
        expect(res.body).to.deep.have.property('events.[0].subcamp', 'Unity');
      });
    });

    it('should give empty response when filter does not have possible results', () => {
      request(app).get('/api/calendarEvents/translations')
      .query({ filter: { where: { subcamp: 'Raiku' } } })
      .expect(200)
      .expect(res => {
        expect(res.body.events).to.be.empty;
      });
    });

    it('should give response when textfilter has possible results on name', () =>
      request(app).get('/api/calendarEvents/translations')
      .query({ textfilter: 'car' })
      .expect(200)
      .expect(res => {
        expect(res.body).to.deep.have.property('events.[0].name', 'Car trip');
      })
    );

    it('should give response when textfilter has possible results on description', () =>
      request(app).get('/api/calendarEvents/translations')
      .query({ textfilter: 'road' })
      .expect(200)
      .expect(res => {
        expect(res.body).to.deep.have.property('events.[0].description', 'roadtrip');
      })
    );

    it('should give response when textfilter has possible results on both name and description', () =>
      request(app).get('/api/calendarEvents/translations')
      .query({ textfilter: 'trip' })
      .expect(200)
      .expect(res => {
        expect(res.body).to.deep.have.property('events.[0].name', 'Car trip');
        expect(res.body).to.deep.have.property('events.[0].description', 'roadtrip');
      })
    );

    it('should give empty response when textfilter does not have possible results', () => {
      request(app).get('/api/calendarEvents/translations')
      .query({ textfilter: 'Saunailta' })
      .expect(200)
      .expect(res => {
        expect(res.body.events).to.be.empty;
      });
    });

    it('should not allow get users through event', () => {
      request(app).get('/api/calendarEvents/translations')
      .query({ include: 'usersInEvent' })
      .expect(401);
    });
  });
});
