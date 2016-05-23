import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import _ from 'lodash';
import * as errorUtils from '../utils/errors';

module.exports = function(AchievementCategory) {

  AchievementCategory.FindTranslations = function(language, cb) {
    const Achievement = app.models.Achievement;

    translationUtils.getLangIfNotExists(language)
      .then(lang => {

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
              const AchievementPromise = translationUtils.getTranslationsForModel(Achievement, lang, { where: { categoryId: category.idFromSource } })
                .then(AchievementTranslations => {
                  _.forEach(AchievementTranslations, ach => {
                    catAchievements.push({             // add single Achievement
                      'title': ach.name,
                      'bodytext': ach.description,
                      'sort_no': ach.sortNo,
                      'last_modified': ach.lastModified,
                      'id': ach.achievementId,
                      'achievement_count': ach.achievementCount,
                    });
                  });
                })
                .then(rCategories.push({
                  'title': category.name,
                  'id': category.categoryId,
                  'sort_no': category.sortNo,
                  'last_modified': category.lastModified,
                  'achievement_count': category.achievementCount,
                  'leading_score': category.leadingScore,
                  'average_score': category.averageScore,
                  'user_score': Math.floor(((category.leadingScore + category.averageScore) / 2)*Math.random()),
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
