import app from '../src/server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import * as translationUtils from '../src/common/utils/translations';

export function locationsHandler(err, data, cb) {
  // cb is used for running this in tests
  const categories = [];
  const catNames = [];
  const locations = [];

  let categoryIndex = 1;
  let categorySortNo = 1;

  //return new Promise((resolve, reject) => {

    if (err) {
      console.log('Aborting sharepoint loading due error:', err);
      //reject(err);
      if (cb) cb();
      else return 0;
    } else {
      _.forEach(data, item => {
        const categoryObj = {
          'name': {
            'FI': item.Kategoria,
            'SV': item.Kategoria,
            'EN': item.Kategoria,
          },
          'sortNo': categorySortNo,
          'idFromSource': categoryIndex,
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
          'gridLatitude': selfOrEmpty(item.Koordinaattiruutu.substring(0,1)),
          'gridLongitude': selfOrEmpty(item.Koordinaattiruutu.substring(1,3)),
        });
      });

      Promise.join(
        translationUtils.createTranslationsForModel('LocationCategory', categories),
        translationUtils.createTranslationsForModel('Location', locations),
        (cr, loc) => {
          //console.log('Created', categories.length, 'location categories');
          destroyAllByNameGuid('LocationCategory', cr);

          //console.log('Created', locations.length, 'locations');
          destroyAllByNameGuid('Location', loc);
      })
      .then(() => {
        if (cb) cb();
        else return 1;
      });

/*
      translationUtils.createTranslationsForModel('LocationCategory', categories).then(cr => {
        destroyAllByNameGuid('LocationCategory', cr);
      });
      translationUtils.createTranslationsForModel('Location', locations).then(loc => {
        destroyAllByNameGuid('Location', loc);
      });
*/

    }
  //});
}

function isInArray(obj, arr) {
  let i;
  for (i = 0; i < arr.length; i++) {
    if(arr[i] == obj) return true;
  }
  return false;
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
    //console.log('Deleted', info.count, 'unused instances of', modelName);
  });
}

function selfOrEmpty(val) {
  return val || '';
}

function readSharepointList(listName, handler) {
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
    handler(e, null);
  }
  
}

if (require.main === module) {
  readSharepointList('Paikat', locationsHandler);
}
