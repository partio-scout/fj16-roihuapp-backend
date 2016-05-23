import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import _ from 'lodash';
import * as errorUtils from '../utils/errors';

module.exports = function(InstructionCategory) {

  InstructionCategory.FindTranslations = function(language, afterDate, cb) {
    const Instruction = app.models.Instruction;

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

        translationUtils.getTranslationsForModel(InstructionCategory, lang)
          .then(categoryTranslations => {
            const promises = [];
            _.forEach(categoryTranslations, category => {
              const catArticles = [];
              let articleFilter = { where: { categoryId: category.idFromSource } };

              if (afterDate) {
                // Five minustes "safezone" for filtering
                const afterDate_5min_before = new Date(afterDate);
                afterDate_5min_before.setMinutes(afterDate_5min_before.getMinutes() - 5);

                articleFilter = { where: {
                  and: [
                    /*{ lastModified: { gt: afterDate } },*/
                    { lastModified: { gt: afterDate_5min_before } },
                    { categoryId: category.idFromSource },
                  ],
                } };
              }

              const instructionPromise = translationUtils.getTranslationsForModel(Instruction, lang, articleFilter)
                .then(instructionTranslations => {
                  const catInstr = [];
                  _.forEach(instructionTranslations, instruct => {
                    catInstr.push({             // add single instruction
                      'title': instruct.name,
                      'bodytext': instruct.description,
                      'sort_no': instruct.sortNo,
                      'last_modified': instruct.lastModified,
                      'id': instruct.instructionId,
                    });
                  });
                  catArticles.push(catInstr);   // add instruction group to category

                })
                .then(rCategories.push({
                  'title': category.name,
                  'id': category.categoryId,
                  'sort_no': category.sortNo,
                  'last_modified': category.lastModified,
                  'articles': catArticles,
                }))
                .catch(err => {
                  cb(errorUtils.createHTTPError('Something went wrong', 500, err.message), null);
                  return;
                });

              promises.push(instructionPromise);
            });

            Promise.all(promises)
              .then(() => {
                response.categories = rCategories;
                cb(null, response);
              });
          });
      });

  };

  InstructionCategory.remoteMethod(
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
