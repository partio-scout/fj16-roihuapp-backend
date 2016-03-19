import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations';
import _ from 'lodash';

module.exports = function(InstructionCategory) {

  InstructionCategory.FindTranslations = function(lang, cb) {
    const Instruction = app.models.Instruction;

    if (!lang || !translationUtils.langExists(lang)) {
      lang = 'EN';
    }

    const timeNow = Date.now();
    const response = {
      'timestamp': timeNow,
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
                  'id': instruct.id,
                });
              });
              catArticles.push(catInstr);   // add instruction group to category

            })
            .then(rCategories.push({
              'title': category.name,
              'id': category.id,
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
