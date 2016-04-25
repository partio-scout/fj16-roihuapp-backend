//import app from '../../server/server';

module.exports = function(BaseCategory) {
  BaseCategory.observe('before delete', (ctx, next) => {
    // Can't delete translations by guid in this case, because we only have guids for instances of single model
    // calling delete with these guids leaves only translations for single modeltype and destroys everything else
    /*
    console.log('Deleting translations for', ctx.Model.pluralModelName);
    // assumes that models are deleted by their name guid
    app.models.Translation.destroyAll({ guId: ctx.where.name }, (err, info) => {
      if (err) console.error(err);
      console.log('Deleted', info.count, 'translations');
      next();
    });
    */
    next();
  });
};
