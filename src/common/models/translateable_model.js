import app from '../../server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import { isUUID } from '../utils/translations';

module.exports = function(TranslateableModel) {

  TranslateableModel.observe('before delete', (ctx, next) => {

    const model = app.models[ctx.Model.modelName];
    const findModels = Promise.promisify(model.find, { context: model });
    const deleteTranslations = Promise.promisify(app.models.Translation.destroyAll, { context: app.models.Translation });

    findModels({ where: ctx.where })
    .then(models => {
      const guIdsToDelete = [];

      _.forEach(models, mod => {
        _.forEach(mod.__data, value => {
          if (isUUID(value)) {
            // add translation guid to deletes list
            guIdsToDelete.push(value);
          }
        });
      });

      // delete translations
      return deleteTranslations({ guId: { inq: guIdsToDelete } });
    }).asCallback(next);
  });

};
