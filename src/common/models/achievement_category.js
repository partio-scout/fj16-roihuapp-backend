import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import _ from 'lodash';
import * as errorUtils from '../utils/errors';
import loopback from 'loopback';

module.exports = function(AchievementCategory) {

  AchievementCategory.FindTranslations = function(language, cb) {
    const Achievement = app.models.Achievement;
    const ctx = loopback.getCurrentContext();
    const ApiUser = app.models.ApiUser;
    let currentUserId = null;

    if (ctx.active.accessToken) {   // user is logged in
      currentUserId = ctx.active.accessToken.userId;
    }

    Promise.join(
      translationUtils.getLangIfNotExists(language),
      ApiUser.getCompletedAchievementIds(currentUserId),
      (lang, userCompletedAchievemets) => {

        const timeNow = new Date();
        const timeNext = new Date(timeNow);
        timeNext.setHours(timeNow.getHours() + 1);
        const response = {
          'timestamp': timeNow.toISOString(),
          'next_check': timeNext.toISOString(),
          'language': lang,
        };
        const rCategories = [];

        translationUtils.getTranslationsForModel(AchievementCategory, lang)
        .then(categoryTranslations => {
          const promises = [];
          _.forEach(categoryTranslations, category => {
            const catAchievements = [];
            let userScoreInCategory = 0;
            const AchievementPromise = translationUtils.getTranslationsForModel(Achievement, lang, {
              where: { categoryId: category.idFromSource },
              order: 'sortNo DESC',
            })
            .then(AchievementTranslations => {
              _.forEach(AchievementTranslations, ach => {
                const userAchieved = (_.indexOf(userCompletedAchievemets, ach.achievementId) === -1) ? false : true;
                if (userAchieved) {
                  userScoreInCategory += 1;
                }
                catAchievements.push({             // add single Achievement
                  'title': ach.name,
                  'bodytext': ach.description,
                  'sort_no': ach.sortNo,
                  'last_modified': ach.lastModified,
                  'id': ach.achievementId,
                  'achievement_count': ach.achievementCount,
                  'userAchieved': userAchieved,
                });

              });
            })
            .then(() => rCategories.push({
              'title': category.name,
              'id': category.categoryId,
              'sort_no': category.sortNo,
              'last_modified': category.lastModified,
              'achievement_count': category.achievementCount,
              'leading_score': category.leadingScore,
              'average_score': category.averageScore,
              'user_score': userScoreInCategory,
              'achievements': catAchievements,
            }))
            .catch(err => {
              cb(errorUtils.createHTTPError('Something went wrong', 500, err.message), null);
              return;
            });

            promises.push(AchievementPromise);
          });

          Promise.all(promises)
          .then(() => {
            response.agelevels = rCategories;
            cb(null, response);
          });
        });
      });
  };

  AchievementCategory.remoteMethod(
    'FindTranslations',
    {
      http: { path: '/translations', verb: 'get' },
      accepts: [
        { arg: 'lang', type: 'string', http: { source: 'query' }, required: false },
      ],
      returns: { type: 'array', root: true },
    }
  );

};
