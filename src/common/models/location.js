module.exports = function(Location) {
  Location.observe('before save', (ctx, next) => {
    if (ctx.instance) {
      if (ctx.instance.gridLatitude && !/^[A-Z]{1}$/.test(ctx.instance.gridLatitude)) {
        ctx.instance.gridLatitude = '';
      }
      if (ctx.instance.gridLongitude && !/^[0-9]{2}$/.test(ctx.instance.gridLongitude)) {
        ctx.instance.gridLongitude = '';
      }
    } else {
      if (ctx.gridLatitude && !/^[A-Z]{1}$/.test(ctx.gridLatitude)) {
        ctx.gridLatitude = '';
      }
      if (ctx.gridLongitude && !/^[0-9]{2}$/.test(ctx.gridLongitude)) {
        ctx.gridLongitude = '';
      }
    }
    next();
  });
};
