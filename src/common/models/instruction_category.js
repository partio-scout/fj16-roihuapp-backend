import app from '../../server/server';
import Promise from 'bluebird';
import * as translationUtils from '../utils/translations'

module.exports = function(InstructionCategory) {  

  InstructionCategory.FindInstrunctions = function(lang, id, cb) {
    const FindInstrunctionCategory = Promise.promisify(InstructionCategory.find, {context: InstructionCategory});
    const FindInstrunctionCategoryById = Promise.promisify(InstructionCategory.findById, {context: InstructionCategory});
    
    translationUtils.getTranslationsForModel(InstructionCategory, lang)
      .then(x => console.log(x));
    cb(null, 'asd');

  };

  InstructionCategory.remoteMethod(
    'FindInstrunctions',
    {
      http: { path: '/instructions', verb: 'get' },
      accepts: [
        { arg: 'lang', type: 'string', http: { source: 'query' }, required: true },
        { arg: 'id', type: 'number', http: { source: 'query' } },
      ],
      returns: { type: 'array', root: true },
    }
  );

  /* ------------------------------ */


};

