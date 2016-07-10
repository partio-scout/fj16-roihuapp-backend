import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import _ from 'lodash';
import * as errorUtils from '../utils/errors';

module.exports = function(LocationCategory) {

  LocationCategory.FindTranslations = function(language, afterDate, cb) {
    const Location = app.models.Location;

    translationUtils.getLangIfNotExists(language)
      .then(lang => {

        const response = {
          'timestamp': '2016-07-03T06:00:00.000Z',
          'next_check': '2016-07-03T06:00:00.000Z',
          ttl: 3600,
          'language': lang,
        };
        const rCategories = [];

        translationUtils.getTranslationsForModel(LocationCategory, lang)
          .then(categoryTranslations => {
            const promises = [];
            _.forEach(categoryTranslations, category => {
              const articles = [];
              let articleFilter = {
                where: {
                  and: [
                    /*{ deleted: false },*/
                    { categoryId: category.idFromSource },
                  ],
                },
                order: 'sortNo DESC',
              };

              if (afterDate) {
                // Five minustes "safezone" for filtering
                const afterDate_5min_before = new Date(afterDate);
                afterDate_5min_before.setMinutes(afterDate_5min_before.getMinutes() - 5);

                articleFilter = {
                  where: {
                    and: [
                      /*{ lastModified: { gt: afterDate } },*/
                      { lastModified: { gt: afterDate_5min_before } },
                      { categoryId: category.idFromSource },
                    ],
                  },
                  order: 'sortNo DESC',
                };
              }

              const LocationPromise = translationUtils.getTranslationsForModel(Location, lang, articleFilter)
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
                      'deleted': loc.deleted,
                      'imageUrl': loc.imageUrl,
                    });
                  });
                })
                .then(rCategories.push({
                  'title': category.name,
                  'id': category.categoryId,
                  'sort_no': category.sortNo,
                  'last_modified': category.lastModified,
                  'articles': articles,
                }))
                .catch(err => {
                  cb(errorUtils.createHTTPError('Something went wrong', 500, err.message), null);
                  return;
                });

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
        { arg: 'afterDate', type: 'string', http: { source: 'query' }, required: false, description: 'Find only articles that have been modified afted this date' },
      ],
      returns: { type: 'array', root: true },
    }
  );

};
