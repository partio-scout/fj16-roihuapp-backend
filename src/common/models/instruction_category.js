import Promise from 'bluebird';

module.exports = function(InstructionCategory) {

  InstructionCategory.FindTranslations = function(language, afterDate, cb) {
    const findCategory = Promise.promisify(InstructionCategory.find, { context: InstructionCategory });

    const timeNow = new Date();
    const timeNext = new Date(timeNow);
    timeNext.setHours(timeNow.getHours() + 1);
    const response = {
      timestamp: timeNow.toISOString(),
      next_check: timeNext.toISOString(),
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
      include: {
        relation: 'instructions',
        scope: {
          where: {
            and: andFilter,
          },
        },
      },
    }).then(categories => {
      response.categories.push(categories);
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
