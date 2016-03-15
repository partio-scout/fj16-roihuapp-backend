//import app from '../../server/server';
import * as translationUtils from '../utils/translations';

module.exports = function(InstructionCategory) {

  InstructionCategory.FindInstrunctions = function(lang, cb) {

    translationUtils.getTranslationsForModel(InstructionCategory, lang)
      .then(tr => cb(null, tr));

  };

  InstructionCategory.remoteMethod(
    'FindInstrunctions',
    {
      http: { path: '/instructions', verb: 'get' },
      accepts: [
        { arg: 'lang', type: 'string', http: { source: 'query' }, required: true },
      ],
      returns: { type: 'array', root: true },
    }
  );

};
