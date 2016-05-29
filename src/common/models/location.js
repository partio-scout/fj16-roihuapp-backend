module.exports = function(Location) {
  Location.observe('before save', (ctx, next) => {
    if (ctx.instance) {
      const validateLat = validateGridLatitude(ctx.instance.gridLatitude);
      const validateLon = validateGridLongitude(ctx.instance.gridLongitude);
      if (validateLat && validateLon) {
        ctx.instance.gridLatitude = validateLat;
        ctx.instance.gridLongitude = validateLon;
      } else {
        ctx.instance.gridLatitude = '';
        ctx.instance.gridLongitude = '';
      }
    } else {
      const validateLat = validateGridLatitude(ctx.gridLatitude);
      const validateLon = validateGridLongitude(ctx.gridLongitude);
      if (validateLat && validateLon) {
        ctx.gridLatitude = validateLat;
        ctx.gridLongitude = validateLon;
      } else {
        ctx.gridLatitude = '';
        ctx.gridLongitude = '';
      }
    }
    next();
  });

  function validateGridLatitude(lat) {
    return (/^[A-Za-z]{1}$/.test(lat)) ? lat.toUpperCase() : '';
  }

  function validateGridLongitude(lon) {
    return (/^[0-9]{2}$/.test(lon)) ? lon.toUpperCase() : '';
  }
};
