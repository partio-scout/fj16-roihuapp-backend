import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import _ from 'lodash';

module.exports = function(AchievementCategory) {
  AchievementCategory.FindTranslations = function(lang, cb) {
    const achievement = app.models.achievement;

    if (!lang || !translationUtils.langExists(lang)) {
      lang = 'EN';
    }

    const timeNow = Date.now();
    const response = {
      'timestamp': timeNow,
      'language': lang,
    };
    const rCategories = [];
    translationUtils.getTranslationsForModel(AchievementCategory, lang)
      .then(categoryTranslations => {
        const promises = [];
        _.forEach(categoryTranslations, category => {
          const catArticles = [];
          const achievementPromise = translationUtils.getTranslationsForModel(achievement, lang, { where: { categoryId: category.idFromSource } })
            .then(achievementTranslations => {
              const catInstr = [];
              _.forEach(achievementTranslations, instruct => {
                catInstr.push({             // add single achievement
                  'title': instruct.name,
                  'bodytext': instruct.description,
                  'sort_no': instruct.sortNo,
                  'last_modified': instruct.lastModified,
                  'id': instruct.id,
                });
              });
              catArticles.push(catInstr);   // add achievement group to category

            })
            .then(rCategories.push({
              'title': category.name,
              'id': category.id,
              'sort_no': category.sortNo,
              'last_modified': category.lastModified,
              'articles': catArticles,
            }));

          promises.push(achievementPromise);
        });

        Promise.all(promises)
          .then(() => {
            response.categories = rCategories;
            cb(null, response);
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
