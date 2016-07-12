import Promise from 'bluebird';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as errorUtils from '../utils/errors';
import path from 'path';
import _ from 'lodash';
import * as translationUtils from '../utils/translations';
import app from '../../server/server';
import request from 'superagent';
import loopback from 'loopback';

export default function(RoihuUser) {

  RoihuUser.observe('before save', (ctx, next) => {
    // create random password if needed
    // and update fields to match REKI data

    const findUser = Promise.promisify(RoihuUser.findById, { context: RoihuUser });
    const userId = loopback.getCurrentContext() ? loopback.getCurrentContext().get('accessToken').userId : 0;

    const userModel = ctx.instance || ctx.data;
    findUser(userId)
    .then(user => RoihuUser.getRekiInformation(user.memberNumber))
    .then(userInfo => {
      userModel.subcamp = userInfo.subCamp,
      userModel.ageGroup = userInfo.ageGroup,
      userModel.phone = userInfo.phoneNumber,
      userModel.primaryTroopAndCity = userInfo.localGroup
    })
    .then(() => {
      // set default field values here
      if (!userModel.password) {
        userModel.password = crypto.randomBytes(24).toString('hex');
      }

      if (ctx.instance) {
        ctx.instance = userModel;
      } else {
        ctx.data = userModel;
      }
    }).catch(err => {
      console.log(err);
    }).asCallback(next);

  });

  RoihuUser.afterRemote('findById', (ctx, modelInstance, next) => {

    next();
  });

  RoihuUser.beforeRemote('prototype.__link__achievements', (ctx, modelInstance, next) => {
    // check if user already has achieved this achievement
    RoihuUser.getCompletedAchievementIds(ctx.req.params.id)
    .then(completed => {
      if (_.indexOf(completed, parseInt(ctx.req.params.fk)) === -1) {
        // increase achievement counts for achievement and category
        RoihuUser.addOrReduceAchievementScores(1, ctx.req.params.fk);
      }
    }).asCallback(next);
  });

  RoihuUser.beforeRemote('prototype.__unlink__achievements', (ctx, modelInstance, next) => {
    // check if user already has achieved this achievement
    RoihuUser.getCompletedAchievementIds(ctx.req.params.id)
    .then(completed => {
      if (_.indexOf(completed, parseInt(ctx.req.params.fk)) !== -1) {
        // decreace achievement counts for achievement and category
        RoihuUser.addOrReduceAchievementScores(-1, ctx.req.params.fk);
      }
    }).asCallback(next);
  });

  RoihuUser.beforeRemote('prototype.__link__calendarEvents', (ctx, modelInstance, next) => {
    const CalendarEvent = app.models.CalendarEvent;

    RoihuUser.getAttendingEventIds(ctx.req.params.id)
    .then(eventIds => {
      if (_.indexOf(eventIds, parseInt(ctx.req.params.fk)) === -1) {

        CalendarEvent.addOrReduceParticipants(1, ctx.req.params.fk);
      }
    }).asCallback(next);
  });

  RoihuUser.beforeRemote('prototype.__unlink__calendarEvents', (ctx, modelInstance, next) => {
    const CalendarEvent = app.models.CalendarEvent;

    RoihuUser.getAttendingEventIds(ctx.req.params.id)
    .then(eventIds => {
      if (_.indexOf(eventIds, parseInt(ctx.req.params.fk)) !== -1) {

        CalendarEvent.addOrReduceParticipants(-1, ctx.req.params.fk);
      }
    }).asCallback(next);
  });

  RoihuUser.getRekiInformation = (memberNumber) => {
    const rekiUrl = process.env.REKI_URL;
    const accessToken = process.env.REKI_ACCESSTOKEN;

    return new Promise((resolve, reject) => {
      request.get(`${rekiUrl}/api/Participants/appInformation?access_token=${accessToken}&memberNumber=${memberNumber}`)
      .end((err, userInfo) => {
        if (err) reject(err);
        else {
          resolve(userInfo.body);
        }
      });
    });
  };

  RoihuUser.addOrReduceAchievementScores = function(amount, achievementId) {
    const findAchievement = Promise.promisify(app.models.Achievement.findOne, { context: app.models.Achievement });
    const findAchievementCategory = Promise.promisify(app.models.AchievementCategory.findOne, { context: app.models.AchievementCategory });

    return findAchievement({
      where: { achievementId: achievementId },
    }).then(achievement => {
      achievement.updateAttribute('achievementCount', achievement.achievementCount + amount);
      return findAchievementCategory({
        // PUT CORRECT ID HERE WHEN IT CHANGES!!!
        where: { idFromSource: achievement.categoryId },
      });
    }).then(category => {
      category.updateAttribute('achievementCount', category.achievementCount + amount);
    });
  };

  RoihuUser.findByMemberNumber = function(memberNumber) {
    const query = {
      where: {
        memberNumber: memberNumber,
      },
    };
    return RoihuUser.findOne(query);
  };

  RoihuUser.emailLogin = function(mail, cb) {
    const ACCESS_TOKEN_LIFETIME = 6 * 30 * 24 * 60 * 60;
    const findUser = Promise.promisify(RoihuUser.findOne, { context: RoihuUser });
    const createUser = Promise.promisify(RoihuUser.create, { context: RoihuUser });

    function findOrCreateUser(mail) {
      return findUser({ where: { email: mail } })
      .then(user => {
        if (user) return user;
        else {
          return createUser({
            firstname: 'NoName',
            lastname: 'NoName',
            email: mail,
            password: crypto.randomBytes(24).toString('hex'),
            lastModified: new Date(),
          })
          .catch(err => console.log(err));
        }
      });
    }

    function generateAccessToken(user) {
      console.log(user);
      return user.createAccessToken(ACCESS_TOKEN_LIFETIME);
    }

    findOrCreateUser(mail)
    .then(generateAccessToken)
    .then(token => {
      // mail settings in nodemailer format
      const url = `${process.env.APP_URL}/emailredirect/${token.userId}/${token.id}`;
      const mailSettings = require(path.join(__dirname, '..', '..', '..', 'mailsettings.js'));
      const transporter = nodemailer.createTransport(mailSettings);
      const mailOptions = {
        from: `"roihuapp" <noreply@roihu2016.fi>`,
        to: mail,
        subject: 'Roihuapp email login',
        text: url,
        html: `<a href="${url}">${url}</a>`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(err);
          cb(errorUtils.createHTTPError('mail send failed', 500, null), null);
        }
        cb(null, 'Mail sent!');
        console.log(info);
      });
    })
    .catch(err => {
      cb(err, null);
    });

  };

  /*
    Get completed achievements as translated
  */
  RoihuUser.completedAchievements = function(userId, lang, cb) {
    const findUser = Promise.promisify(RoihuUser.findOne, { context: RoihuUser });

    findUser({
      where: { id: userId },
      include: 'achievements',
    })
    .then(user => {
      const u = user.toJSON();

      translationUtils.getLangIfNotExists(lang)
      .then(language => {
        const response = [];
        const promises = [];
        _.forEach(u.achievements, achievement => {
          const p = translationUtils.translateModel(achievement, language)
          .then(ach => response.push(ach));
          promises.push(p);
        });

        Promise.all(promises)
        .then(() => {
          cb(null, response);
        });
      });
    })
    .catch(err => cb(err, null));
  };

  RoihuUser.getCompletedAchievementIds = function(userId) {
    return new Promise((resolve, reject) => {
      const findUser = Promise.promisify(RoihuUser.findOne, { context: RoihuUser });

      if (userId) {
        findUser({
          where: { id: userId },
          include: {
            relation: 'achievements',
            scope: {
              fields: ['achievementId'],
            },
          },
        })
        .then(user => {
          user = user.toJSON();

          const userCompletedAchievemets = [];
          _.forEach(user.achievements, achievement => {
            userCompletedAchievemets.push(achievement.achievementId);
          });
          return userCompletedAchievemets;
        })
        .then(completed => resolve(completed))
        .catch(() => resolve([]));
      } else {
        resolve([]);
      }
    });
  };

  RoihuUser.getAttendingEventIds = function(userId) {
    return new Promise((resolve, reject) => {
      const findUser = Promise.promisify(RoihuUser.findOne, { context: RoihuUser });

      if (userId) {
        findUser({
          where: { id: userId },
          include: {
            relation: 'calendarEvents',
            scope: {
              fields: ['eventId'],
            },
          },
        })
        .then(user => {
          user = user.toJSON();

          const events = [];
          _.forEach(user.calendarEvents, event => {
            events.push(event.eventId);
          });
          return events;
        })
        .then(evt => resolve(evt))
        .catch(() => resolve([]));
      } else {
        resolve([]);
      }
    });
  };

  RoihuUser.calendar = function(userId, lang, cb) {
    const findUser = Promise.promisify(RoihuUser.findOne, { context: RoihuUser });
    const CalendarEvent = app.models.CalendarEvent;

    translationUtils.getLangIfNotExists(lang)
    .then(language => {
      let User;
      findUser({
        where: { id: userId },
        include: {
          relation: 'calendarEvents',
          scope: {
            fields: [
              'eventId', 'type', 'name', 'description', 'locationName', 'lastModified',
              'status', 'startTime', 'endTime', 'gpsLatitude', 'gpsLongitude', 'gridLatitude',
              'gridLongitude', 'subcamp', 'camptroop', 'ageGroups', 'wave', 'participantCount',
            ],
            order: 'startTime ASC',
          },
        },
      })
      .then(u => {
        User = u.toJSON();
        if (!User.subcamp || !User.ageGroup || !User.wave) return [];
        else {

          return translationUtils.getTranslationsForModel(CalendarEvent, language, {
            where: {
              and: [
                { status: 'mandatory' },
                { or: [
                  { subcamp: { like: `\%${User.subcamp}\%` } },
                  { subcamp: '' },
                ] },
                { or: [
                  { ageGroups: { like: `\%${getFirstBeforeSeparator(User.ageGroup, '/')}\%` } },
                  { ageGroups: '' },
                ] },
                { or: [
                  { wave: { like: `\%${User.wave}\%` } },
                  { wave: '' },
                ] },
              ],
            },
            fields: {
              sharepointId: false,
              source: false,
            },
            order: 'startTime ASC',
          });
        }
      })
      .then(mandatoryEvents => {
        const timeNow = new Date();
        const timeNext = new Date(timeNow);
        timeNext.setHours(timeNow.getHours() + 1);

        const response = {
          timestamp: timeNow.toISOString(),
          next_check: timeNext.toISOString(),
          language: language,
          events: [],
        };
        const promises = [];

        // User own events
        _.forEach(User.calendarEvents, event => {
          const p = translationUtils.translateModel(event, language)
          .then(evt => response.events.push(evt));
          promises.push(p);
        });

        // Mandatory events
        _.forEach(mandatoryEvents, event => {
          // filter out unnecessary fields if needed
          response.events.push(event);
        });

        Promise.all(promises)
        .then(() => {
          cb(null, response);
        });
      })
      .catch(err => cb(err, null));
    });
  };

  function getFirstBeforeSeparator(stringValue, sep) {
    return _.split(stringValue, sep, 1)[0];
  }

  RoihuUser.remoteMethod(
    'emailLogin',
    {
      http: { path: '/emailLogin', verb: 'post' },
      accepts: [
        { arg: 'email', type: 'string' },
      ],
      returns: { arg: 'token', type: 'string' },
    }
  );

  RoihuUser.remoteMethod(
    'completedAchievements',
    {
      http: { path: '/:id/completedAchievements', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'number', required: 'true', http: { source: 'path' } },
        { arg: 'lang', type: 'string' },
      ],
      returns: { arg: 'completedAchievements', type: 'array' },
    }
  );

  RoihuUser.remoteMethod(
    'calendar',
    {
      http: { path: '/:id/calendar', verb: 'get' },
      accepts: [
        { arg: 'id', type: 'number', required: 'true', http: { source: 'path' } },
        { arg: 'lang', type: 'string' },
      ],
      returns: { arg: 'calendar', type: 'array' },
      description: 'Get user calendar including mandatory events',
    }
  );
}
