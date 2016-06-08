import app from '../src/server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import * as translationUtils from '../src/common/utils/translations';

export function locationsHandler(err, data) {
  // callback is used for running this in tests
  const categories = [];
  const catNames = [];
  const locations = [];
  const localTranslationsDone = [];

  let categoryIndex = 1;
  let categorySortNo = 1;

  return new Promise((resolve, reject) => {

    if (err) {
      reject(err);
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
        .then(() => resolve()));
    }
  });

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
}

export function eventsHandler(err, data) {
  return new Promise((resolve, reject) => {
    if (err) {
      reject(err);
    } else {
      readSharepointList('Leiriaikataulu-app', (err, infodata) => {
        console.log(infodata);
        return Promise.resolve(infodata);
      }).then(additionalInfoData => {
        return;
        _.forEach(data, item => {
          // filter out events with invalid data
          if (isEmpty(item.Alkuaika)) return;
          if (isEmpty(item.Loppuaika)) return;
          if (isEmpty(item.Kategoria)) return;
          if (isEmpty(item.Title)) return;
          if (isEmpty(item.Lis_x00e4_tietolinkkiId)) return;

          // get additional information
          console.log(item.Title);
          getAdditionalInfo(additionalInfoData, item.Lis_x00e4_tietolinkkiId);

        });
      });
    }
  });

  function getAdditionalInfo(infodata, infoId) {
    console.log(infodata);
    _.forEach(infodata, item => {
      console.log(item);
    });
  }
}

function isEmpty(value) {
  return (value === null || value === '');
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

export function readSharepointList(listName, handler) {
  return new Promise((resolve, reject) => {
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
            handler(err, data).then(() => resolve());
          });

          /*
          // list all lists
          sharepoint.lists.list((err, res) => {
            _.forEach(res, x => {
              console.log(x.Title);
              console.log(x.Description);
              console.log('-------------');
            });
          });*/
        }
      });
    } catch (e) {
      // missing credentials will throw catchable error
      handler(e, null);
    }
  });
}

if (require.main === module) {
  if (process.argv[2]) {
    if (process.argv[2] == 'locations') {
      readSharepointList('Paikat', locationsHandler);
    } else if (process.argv[2] == 'events') {
      readSharepointList('Leiriaikataulu', eventsHandler); 
    }
  } else {
    // events depend on locations data
    readSharepointList('Paikat', locationsHandler)
    .then(() => {
      readSharepointList('Leiriaikataulu', eventsHandler);
    });
  }
}
