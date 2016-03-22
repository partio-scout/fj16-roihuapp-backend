import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import _ from 'lodash';

module.exports = function(InstructionCategory) {

  InstructionCategory.FindTranslations = function(language, cb) {
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
              const instructionPromise = translationUtils.getTranslationsForModel(Instruction, lang, { where: { categoryId: category.idFromSource } })
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
                  'id': category.instructionCategoryId,
                  'sort_no': category.sortNo,
                  'last_modified': category.lastModified,
                  'articles': catArticles,
                }));

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
      ],
      returns: { type: 'array', root: true },
    }
  );

};
