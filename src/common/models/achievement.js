import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import { createHTTPError } from '../utils/errors';
import _ from 'lodash';

module.exports = function(Achievement) {

  Achievement.FindTranslations = function(language, id, cb) {
    const Achievement = app.models.Achievement;
    const achievementExists = Promise.promisify(Achievement.exists, { context: Achievement });
    achievementExists(id)
      .then(exists => {
        if (!exists) {
          cb(createHTTPError('Achievement not found', 404), null);
          return;
        }
      });

    translationUtils.getLangIfNotExists(language)
      .then(lang => {

        const response = [];

        translationUtils.getTranslationsForModel(Achievement, lang, { where: { achievementId: id } })
          .then(AchievementTranslations => {
            _.forEach(AchievementTranslations, ach => {
              response.push({             // add single Achievement
                'title': ach.name,
                'bodytext': ach.description,
                'sort_no': ach.sortNo,
                'last_modified': ach.lastModified,
                'id': ach.AchievementId,
                'achievement_count': ach.achievementCount,
              });
            });

          })
          .then(() => {
            cb(null, response);
          });
      });
  };

  Achievement.remoteMethod(
    'FindTranslations',
    {
      http: { path: '/translations', verb: 'get' },
      accepts: [
        { arg: 'lang', type: 'string', http: { source: 'query' }, required: false },
        { arg: 'id', type: 'number', http: { source: 'query' }, required: true },
      ],
      returns: { type: 'array', root: true },
    }
  );

};

