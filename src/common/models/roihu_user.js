import Promise from 'bluebird';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as errorUtils from '../utils/errors';
import path from 'path';
import _ from 'lodash';
import * as translationUtils from '../utils/translations';
import app from '../../server/server';

export default function(RoihuUser) {

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
}
