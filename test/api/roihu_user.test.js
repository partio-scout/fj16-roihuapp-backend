import app from '../../src/server/server.js';
import request from 'supertest-as-promised';

const RoihuUser = app.models.RoihuUser;

describe('RoihuUser', () => {

  describe('login', () => {
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

});
