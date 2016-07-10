import Promise from 'bluebird';
import _ from 'lodash';

module.exports = function(InstructionCategory) {

  InstructionCategory.FindTranslations = function(language, afterDate, cb) {
    const findCategory = Promise.promisify(InstructionCategory.find, { context: InstructionCategory });

    if (!language) language = 'EN';

    const response = {
      timestamp: '2016-07-03T06:00:00.000Z',
      next_check: '2016-07-03T06:00:00.000Z',
      ttl: 3600,
      language: language,
      categories: [],
    };

    let andFilter = [
      { lang: language },
    ];
    if (afterDate) {
      // Five minustes "safezone" for filtering
      const afterDate_5min_before = new Date(afterDate);
      afterDate_5min_before.setMinutes(afterDate_5min_before.getMinutes() - 5);

      andFilter = [
        { lang: language },
        { lastModified: afterDate_5min_before },
      ];
    }

    findCategory({
      where: {
        lang: language,
      },
      order: 'sortNo DESC',
      fields: {
        lang: false,
      },
      include: {
        relation: 'instructions',
        scope: {
          where: {
            and: andFilter,
          },
          fields: ['instructionId', 'categoryId', 'description', 'lastModified', 'sortNo', 'name'],
          order: 'sortNo DESC',
        },
      },
    }).then(categories => {
      // remap field names
      let currentCategory;
      _.forEach(categories, category => {
        currentCategory = category.toJSON();
        const instr = [];
        _.forEach(currentCategory.instructions, instruction => {

          instr.push({
            id: instruction.instructionId,
            title: instruction.name,
            bodytext: instruction.description,
            sort_no: instruction.sortNo,
            last_modified: instruction.lastModified,
          });
        });

        response.categories.push({
          title: currentCategory.name,
          id: currentCategory.categoryId,
          sort_no: currentCategory.sortNo,
          last_modified: currentCategory.lastModified,
          articles: [instr],
        });
      });

      cb(null, response);
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
