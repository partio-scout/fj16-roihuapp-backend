import Promise from 'bluebird';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as errorUtils from '../utils/errors';
import path from 'path';
import _ from 'lodash';
import * as translationUtils from '../utils/translations';
import app from '../../server/server';

export default function(ApiUser) {

  ApiUser.observe('before save', (ctx, next) => {
    // create random password if needed
    if (ctx.instance) {
      if (!ctx.instance.password) {
        ctx.instance.password = crypto.randomBytes(24).toString('hex');
      }
    } else {
      if (!ctx.data.password) {
        ctx.data.password = crypto.randomBytes(24).toString('hex');
      }
    }
    next();

  });

  ApiUser.beforeRemote('prototype.updateAttributes', (ctx, modelInstance, next) => {
    // prevent changes to membernumber
    if (ctx.req && ctx.req.body)  {
      if (ctx.req.body.memberNumber) {
        delete ctx.req.body.memberNumber;
      }
    }
    next();
  });

  ApiUser.afterRemote('findById', (ctx, modelInstance, next) => {
    if (ctx.result) {
      ctx.result.ageGroup = getAgeGroupTranslations(ctx.result.ageGroup);
    }
    next();

    function getAgeGroupTranslations(ageGroup) {
      const ageGroups = {
        'Perheleiri': 'Perheleiri/Familjeläger/Family camp (0-11)',
        'Tarpojat': 'Tarpoja/Spejarscout/Tracker (12-15)',
        'Samoajat': 'Samoaja/Explorerscout/Explorer (15-17)',
        'Vaeltajat': 'Vaeltaja/Roverscout/Rover (18-22)',
        'Aikuiset': 'Aikuinen/Äldre ledare/Adult ( >22)',
        'Muu': 'Muu/Andra/Other',
      };
      return ageGroups[ageGroup] || ageGroup;
    }
  });

  ApiUser.beforeRemote('prototype.__link__achievements', (ctx, modelInstance, next) => {
    // check if user already has achieved this achievement
    ApiUser.getCompletedAchievementIds(ctx.req.params.id)
    .then(completed => {
      if (_.indexOf(completed, parseInt(ctx.req.params.fk)) === -1) {
        // increase achievement counts for achievement and category
        ApiUser.addOrReduceAchievementScores(1, ctx.req.params.fk);
      }
    }).asCallback(next);
  });

  ApiUser.beforeRemote('prototype.__unlink__achievements', (ctx, modelInstance, next) => {
    // check if user already has achieved this achievement
    ApiUser.getCompletedAchievementIds(ctx.req.params.id)
    .then(completed => {
      if (_.indexOf(completed, parseInt(ctx.req.params.fk)) !== -1) {
        // decreace achievement counts for achievement and category
        ApiUser.addOrReduceAchievementScores(-1, ctx.req.params.fk);
      }
    }).asCallback(next);
  });

  ApiUser.beforeRemote('prototype.__link__calendarEvents', (ctx, modelInstance, next) => {
    const CalendarEvent = app.models.CalendarEvent;

    ApiUser.getAttendingEventIds(ctx.req.params.id)
    .then(eventIds => {
      if (_.indexOf(eventIds, parseInt(ctx.req.params.fk)) === -1) {

        CalendarEvent.addOrReduceParticipants(1, ctx.req.params.fk);
      }
    }).asCallback(next);
  });

  ApiUser.beforeRemote('prototype.__unlink__calendarEvents', (ctx, modelInstance, next) => {
    const CalendarEvent = app.models.CalendarEvent;

    ApiUser.getAttendingEventIds(ctx.req.params.id)
    .then(eventIds => {
      if (_.indexOf(eventIds, parseInt(ctx.req.params.fk)) !== -1) {

        CalendarEvent.addOrReduceParticipants(-1, ctx.req.params.fk);
      }
    }).asCallback(next);
  });

  ApiUser.addOrReduceAchievementScores = function(amount, achievementId) {
    const findAchievement = Promise.promisify(app.models.Achievement.findOne, { context: app.models.Achievement });
    const findAchievementCategory = Promise.promisify(app.models.AchievementCategory.findOne, { context: app.models.AchievementCategory });

    return findAchievement({
      where: { achievementId: achievementId },
    }).then(achievement => {
      if (!achievement) {
        throw new Error('Achievement not found');
      }
      achievement.updateAttribute('achievementCount', achievement.achievementCount + amount);
      return findAchievementCategory({
        // PUT CORRECT ID HERE WHEN IT CHANGES!!!
        where: { idFromSource: achievement.categoryId },
      });
    }).then(category => {
      if (!category) {
        throw new Error('Achievement category not found');
      }
      category.updateAttribute('achievementCount', category.achievementCount + amount);
    });
  };

  /**
   * Find a user by their member number
   * @param {string} memberNumber - The member number to search for
   * @returns {Promise<Object>} The user object if found
   */
  ApiUser.findByMemberNumber = function(memberNumber) {
    const query = {
      where: {
        memberNumber: memberNumber,
      },
    };
    return ApiUser.findOne(query);
  };

  /**
   * Email-based login - sends a login link to the user's email
   * @param {string} mail - User's email address
   * @param {Function} cb - Callback function(error, result)
   * @returns {void}
   */
  ApiUser.emailLogin = function(mail, cb) {
    // Validate email input
    if (!mail || typeof mail !== 'string' || !mail.trim()) {
      return cb(errorUtils.createHTTPError('Valid email is required', 400, null), null);
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      return cb(errorUtils.createHTTPError('Invalid email format', 400, null), null);
    }

    const ACCESS_TOKEN_LIFETIME = 6 * 30 * 24 * 60 * 60;
    const findUser = Promise.promisify(ApiUser.findOne, { context: ApiUser });
    const createUser = Promise.promisify(ApiUser.create, { context: ApiUser });

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
          .catch(err => console.error('Error creating user:', err.message));
        }
      });
    }

    function generateAccessToken(user) {
      console.log('Generating access token for user:', user.id);
      return user.createAccessToken(ACCESS_TOKEN_LIFETIME);
    }

    findOrCreateUser(mail)
    .then(generateAccessToken)
    .then(token => {
      // mail settings in nodemailer format
      const os = require('os');
      const url = `${process.env.APP_URL}/emailredirect/${token.userId}/${token.id}`;
      const mailSettings = require(path.join(__dirname, '..', '..', '..', 'mailsettings.js'));
      const transporter = nodemailer.createTransport(mailSettings);
      const text_fi = 'Avaa tämä linkki puhelimesi nettiselaimella, jolloin Roihu 2016 -appi aukeaa niin, että olet kirjautuneena.';
      const text_en = 'Open this link using your phone\'s Internet browser. This launches the Roihu 2016 app so that you are logged in.';
      const text_se = 'Öppna den här länken med webbläsaren i din telefon. Då öppnas Roihu 2016-appen och du är automatiskt inloggad.';
      const text_text = `${text_fi} ${os.EOL} ${text_en} ${os.EOL} ${text_se} ${os.EOL} ${os.EOL}`;
      const text_html = `${text_fi} <br/> ${text_en} <br/> ${text_se} <br/> <br/>`;

      const mailOptions = {
        from: `"Mobile-app" <noreply@example.com>`,
        to: mail,
        subject: 'Mobile-app email login',
        text: `${text_text}${url}`,
        html: `${text_html}<a href="${url}">${url}</a>`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Failed to send email:', err.message);
          cb(errorUtils.createHTTPError('mail send failed', 500, null), null);
        } else {
          console.log('Email sent successfully to:', mail);
          cb(null, 'Mail sent!');
        }
      });
    })
    .catch(err => {
      console.error('Error in emailLogin:', err.message);
      cb(err, null);
    });

  };

  /**
   * Get village's wave from achievements as string value
   * @param {string} village - Village name
   * @returns {string} Wave identifier (defaults to 'A' if not found)
   */
  ApiUser.getVillageWave = function(village) {
    const village_map = require(path.join(__dirname, '..', '..', '..', 'kyla_aallot.json'));
    const village_data = village_map[village];
    if (village_data) {
      return village_data.aalto;
    } else {
      return 'A';
    }
  };

  /**
   * Get user's completed achievements with translations
   * @param {number} userId - User ID
   * @param {string} lang - Language code (e.g., 'EN', 'FI')
   * @param {Function} cb - Callback function(error, achievements)
   * @returns {void}
   */
  ApiUser.completedAchievements = function(userId, lang, cb) {
    // Validate userId
    if (!userId || typeof userId !== 'number' || userId <= 0) {
      return cb(errorUtils.createHTTPError('Valid user ID is required', 400, null), null);
    }

    const findUser = Promise.promisify(ApiUser.findOne, { context: ApiUser });

    findUser({
      where: { id: userId },
      include: 'achievements',
    })
    .then(user => {
      if (!user) {
        return cb(errorUtils.createHTTPError('User not found', 404, null), null);
      }

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

  /**
   * Get list of achievement IDs that a user has completed
   * @param {number} userId - User ID
   * @returns {Promise<Array<number>>} Array of achievement IDs
   */
  ApiUser.getCompletedAchievementIds = function(userId) {
    return new Promise(resolve => {
      const findUser = Promise.promisify(ApiUser.findOne, { context: ApiUser });

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

          const userCompletedAchievements = [];
          _.forEach(user.achievements, achievement => {
            userCompletedAchievements.push(achievement.achievementId);
          });
          return userCompletedAchievements;
        })
        .then(completed => resolve(completed))
        .catch(() => resolve([]));
      } else {
        resolve([]);
      }
    });
  };

  /**
   * Get list of event IDs that a user is attending
   * @param {number} userId - User ID
   * @returns {Promise<Array<number>>} Array of event IDs
   */
  ApiUser.getAttendingEventIds = function(userId) {
    return new Promise(resolve => {
      const findUser = Promise.promisify(ApiUser.findOne, { context: ApiUser });

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

  /**
   * Get user's calendar including their events and mandatory events
   * @param {number} userId - User ID
   * @param {string} lang - Language code (e.g., 'EN', 'FI')
   * @param {Function} cb - Callback function(error, calendar)
   * @returns {void}
   */
  ApiUser.calendar = function(userId, lang, cb) {
    // Validate userId
    if (!userId || typeof userId !== 'number' || userId <= 0) {
      return cb(errorUtils.createHTTPError('Valid user ID is required', 400, null), null);
    }

    const findUser = Promise.promisify(ApiUser.findOne, { context: ApiUser });
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
              'gridLongitude', 'subcamp', 'camptroop', 'ageGroups', 'wave', 'participantCount','imageUrl',
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

  ApiUser.remoteMethod(
    'emailLogin',
    {
      http: { path: '/emailLogin', verb: 'post' },
      accepts: [
        { arg: 'email', type: 'string' },
      ],
      returns: { arg: 'token', type: 'string' },
    }
  );

  ApiUser.remoteMethod(
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

  ApiUser.remoteMethod(
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
