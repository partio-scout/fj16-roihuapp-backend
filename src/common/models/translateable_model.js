import app from '../../server/server';

module.exports = function(TranslateableModel) {

  TranslateableModel.observe('before delete', (ctx, next) => {
    console.log('Deleting translations for', ctx.Model.pluralModelName);
    // assumes that models are deleted by their name guid
    app.models.Translation.destroyAll({ guId: ctx.where.name }, (err, info) => {
      if (err) console.error(err);
      console.log('Deleted', info.count, 'translations');
      next();
    });

  });
};
