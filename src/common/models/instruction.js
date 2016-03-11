import app from '../../server/server';
import Promise from 'bluebird';
//import _ from 'lodash';

module.exports = function(Instruction) {
  Instruction.FindTranslations = function(lang, id, cb) {

    const TranslationModel = app.models.Translation;
    const findTranslation = Promise.promisify(TranslationModel.find, { context: TranslationModel });
    const findInstruction = Promise.promisify(Instruction.find, { context: Instruction });
    const findInstructionById = Promise.promisify(Instruction.findById, { context: Instruction });

    function createError(code, message) {
      const err = new Error(message);
      err.status = code;
      return err;
    }

    function translationsForSingleInstrunction(id, cb) {
      findInstructionById(id)
        .then(instruction => {
          if (!instruction) {
            cb(createError(401, 'No translations were found with given parameters.'), null);
          }
          const nameQuery = { where: {
            and: [
              { guId: instruction.name },
              { lang: lang },
            ] } };
          const descrQuery = { where: {
            and: [
              { guId: instruction.description },
              { lang: lang },
            ] } };

          const result = [];

          findTranslation(nameQuery)
          .then(names => {
            findTranslation(descrQuery)
            .then(descriptions => {
              if (!names || !descriptions) cb(createError(401, 'No translations were found with given parameters.'), null);

              const x = {
                'title': names[0].text,
                'bodytext': descriptions[0].text,
                'sort_no': instruction.sortNo,
                'last_modified': instruction.lastModified,
                'language': lang,
              };
              result.push(x);
              cb(null, result[0]);
            });
          });

        })
        .catch(() => null ); // just catch it

    }

    if (id) {
      // accessing single instruction
      translationsForSingleInstrunction(id, cb);
    } else {
      // get all translations
      findInstruction()
        .then(instructions => {
          // construct response...
          cb(null, 'Not yet implemented...');
        });
    }

  };

  Instruction.remoteMethod(
    'FindTranslations',
    {
      http: { path: '/translations', verb: 'get' },
      accepts: [
        { arg: 'lang', type: 'string', http: { source: 'query' }, required: true },
        { arg: 'id', type: 'number', http: { source: 'query' } },
      ],
      returns: { type: 'array', root: true },
    }
  );
};
