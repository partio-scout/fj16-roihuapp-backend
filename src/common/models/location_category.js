import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import _ from 'lodash';

module.exports = function(LocationCategory) {

  LocationCategory.FindTranslations = function(language, cb) {
    const Location = app.models.Location;

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

        translationUtils.getTranslationsForModel(LocationCategory, lang)
          .then(categoryTranslations => {
            const promises = [];
            _.forEach(categoryTranslations, category => {
              const articles = [];
              const LocationPromise = translationUtils.getTranslationsForModel(Location, lang, { where: { categoryId: category.idFromSource } })
                .then(LocationTranslations => {
                  _.forEach(LocationTranslations, loc => {
                    articles.push({             // add single Location
                      'title': loc.name,
                      'bodytext': loc.description,
                      'sort_no': loc.sortNo,
                      'last_modified': loc.lastModified,
                      'id': loc.locationId,
                      'gps_latitude': loc.gpsLatitude,
                      'gps_longitude': loc.gpsLongitude,
                      'grid_latitude': loc.gridLatitude,
                      'grid_longitude': loc.gridLongitude,
                    });
                  });

                })
                .then(rCategories.push({
                  'title': category.name,
                  'id': category.categoryId,
                  'sort_no': category.sortNo,
                  'last_modified': category.lastModified,
                  'articles': articles,
                }));

              promises.push(LocationPromise);
            });

            Promise.all(promises)
              .then(() => {
                response.categories = rCategories;
                cb(null, response);
              });
          });
      });
  };

  LocationCategory.remoteMethod(
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
