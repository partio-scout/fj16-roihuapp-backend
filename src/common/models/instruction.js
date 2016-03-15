import app from '../../server/server';
import Promise from 'bluebird';

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

    function translationsForSingleInstrunction(instruction) {
      if (!instruction) {
        return Promise.reject(createError(401, 'No translations were found with given parameters.'));
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

      return findTranslation(nameQuery)
      .then(names => {
        return findTranslation(descrQuery)
        .then(descriptions => {
          if (!names || !descriptions) return Promise.reject(createError(401, 'No translations were found with given parameters.'));

          const x = {
            'title': names[0].text,
            'bodytext': descriptions[0].text,
            'sort_no': instruction.sortNo,
            'last_modified': instruction.lastModified,
            'language': lang,
          };
          result.push(x);
          return Promise.resolve(result[0]);
        });
      });
    }

    if (id) {
      // accessing single instruction
      findInstructionById(id)
        .then(instruction => translationsForSingleInstrunction(instruction))
        .then(response => cb(null, response))
        .catch(err => cb(err, null));

    } else {
      // get all translations
      var response = [];
      findInstruction()
        .then(instructions => {
          return Promise.each(instructions, function(instruction) {
            return translationsForSingleInstrunction(instruction)
              .then(translation => response.push(translation));
          });
        })
        .then(() => cb(null, response))
        .catch(err => cb(err, null));
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

  /* ------------------------------ */


};
