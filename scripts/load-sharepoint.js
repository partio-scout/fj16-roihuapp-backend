import app from '../src/server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import * as translationUtils from '../src/common/utils/translations';

export function locationsHandler(err, data, cb) {
  // callback is used for running this in tests
  const categories = [];
  const catNames = [];
  const locations = [];
  const localTranslationsDone = [];

  let categoryIndex = 1;
  let categorySortNo = 1;

  if (err) {
    if (cb) cb();
    else return 0;

  } else {
    _.forEach(data, item => {
      // filter out places without category
      if (item.Kategoria === null || item.Kategoria === '') {
        return;
      }

      const lt = translationUtils.getLocalFieldTranslations('LocationCategory-name', item.Kategoria, ['FI', 'SV', 'EN'], item.Kategoria)
      .then(catTranslation => {
        const categoryObj = {
          'name': {
            'FI': catTranslation.FI,
            'SV': catTranslation.SV,
            'EN': catTranslation.EN,
          },
          'sortNo': categorySortNo,
          'idFromSource': categoryIndex,
          'lastModified': item.Modified,
        };
        // compare categories with their name instead of full object
        let cIndexNum = catNames.indexOf(item.Kategoria);
        if ( cIndexNum === -1) {
          categories.push(categoryObj);
          catNames.push(item.Kategoria);
          cIndexNum = categoryIndex-1;
          categoryIndex += 1;
          categorySortNo += 1;
        }

        locations.push({
          'name': {
            'FI': item.Title,
            'SV': selfOrEmpty(item.Otsikko_x0020_ruotsiksi),
            'EN': selfOrEmpty(item.Otsikko_x0020_englanniksi),
          },
          'description': {
            'FI': selfOrEmpty(item.Kuvaus),
            'SV': selfOrEmpty(item.Kuvaus_x0020_ruotsiksi),
            'EN': selfOrEmpty(item.Kuvaus_x0020_englanniksi),
          },
          'sortNo': item.Id,
          'idFromSource': item.Id,
          'categoryId': cIndexNum + 1,
          'gpsLatitude': selfOrEmpty(item.Latitude),
          'gpsLongitude': selfOrEmpty(item.Longitude),
          'gridLatitude': getGridCoordinates(item.Koordinaattiruutu).lat,
          'gridLongitude': getGridCoordinates(item.Koordinaattiruutu).lon,
          'lastModified': item.Modified,
        });
      });
      localTranslationsDone.push(lt);
    });

    Promise.all(localTranslationsDone)
    .then(() => Promise.join(
        translationUtils.createTranslationsForModel('LocationCategory', categories),
        translationUtils.createTranslationsForModel('Location', locations),
        (cr, loc) => {
          // delete all other model instances
          destroyAllByNameGuid('LocationCategory', cr);
          destroyAllByNameGuid('Location', loc);
      })
      .then(() => {
        if (cb) cb();
        else return 1;
      }));
  }
}

function destroyAllByNameGuid(modelName, guIdList) {
  const guidsToDelete = [];
  _.forEach(guIdList, obj => {
    _.forEach(obj, item => {
      guidsToDelete.push(item.guId);
    });
  });

  // deletes all instances where name guId is not in our array
  app.models[modelName].destroyAll({ name: { nin: guidsToDelete } }, (err, info) => {
    if (err) console.error(err);
  });
}

function selfOrEmpty(val) {
  return val || '';
}

function getGridCoordinates(gridValue) {
  const coordinates = {
    lat: '',
    lon: '',
  };

  if (!gridValue) {
    return coordinates;
  }

  gridValue = gridValue.toUpperCase();
  const re = /^[A-Z]{1}[0-9]{2}$/;
  if (re.test(gridValue)) {
    coordinates.lat = gridValue.substring(0,1);
    coordinates.lon = gridValue.substring(1,3);
  }
  return coordinates;
}

export function readSharepointList(listName, handler) {
  try {
    const sharepoint = require('sharepointconnector')({
      username : process.env.SHAREPOINT_USER,
      password : process.env.SHAREPOINT_PSW,
      // Authentication type - current valid values: ntlm, basic, online,onlinesaml 
      type : 'online',
      url : 'https://partio.sharepoint.com',
      context : 'roihu/tyokalut',
    });

    sharepoint.login(function(err){
      if (err) {
        handler(err, null);
      } else {      
        sharepoint.listItems.list(listName, (err, data) => {
          handler(null, data);
        });
      }
    });
  } catch (e) {
    // missing credentials will throw catchable error
    handler(e, null);
  }
}

if (require.main === module) {
  readSharepointList('Paikat', locationsHandler);
}
