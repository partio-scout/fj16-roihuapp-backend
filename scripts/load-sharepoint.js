import app from '../src/server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import * as translationUtils from '../src/common/utils/translations';
import request from 'superagent';

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
        //translationUtils.CRUDModels('LocationCategory', categories,  true),
        translationUtils.createTranslationsForModel('LocationCategory', categories),
        translationUtils.CRUDModels('Location', locations, 'idFromSource', false),
        (cr, loc) => {
          destroyAllByNameGuid('LocationCategory', cr);
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
  const Location = app.models.Location;
  const findLocation = Promise.promisify(Location.findOne, { context: Location });

  return new Promise((resolve, reject) => {
    if (err) {
      reject(err);
    } else {
      const events = [];
      const promises = [];

      readSharepointList('Leiriaikataulu-app', (err, infodata) => {
        if (err) return Promise.reject(err);
        else return Promise.resolve(infodata);
      }).then(additionalInfoData => {

        _.forEach(data, item => {
          // filter out events with invalid data
          if (isEmpty(item.Alkuaika)) return;
          if (isEmpty(item.Loppuaika)) return;
          if (isEmpty(item.Kategoria)) return;
          if (isEmpty(item.Title)) return;
          if (isEmpty(item.Lis_x00e4_tietolinkkiId)) return;

          // skip events which category is not for app
          if (!categoryIsForApp(item.Kategoria)) return;

          // get additional information
          const additionalInfo = getAdditionalInfo(additionalInfoData, item.Lis_x00e4_tietolinkkiId);
          const locPromise = findLocation({ where: { idFromSource: item.PaikkaId } })
          .then(location => {
            Promise.join(
            translationUtils.translateModel(location, 'FI'),
            translationUtils.translateModel(location, 'SV'),
            translationUtils.translateModel(location, 'EN'),
            (locFI, locSV, locEN) => {
              events.push({
                name: {
                  FI: selfOrEmpty(additionalInfo.Otsikko_x0020_suomeksi),
                  SV: selfOrEmpty(additionalInfo.Otsikko_x0020_ruotsiksi),
                  EN: selfOrEmpty(additionalInfo.Otsikko_x0020_englanniksi),
                },
                description: {
                  FI: selfOrEmpty(additionalInfo.Lis_x00e4_tiedot_x0020_suomeksi),
                  SV: selfOrEmpty(additionalInfo.Lis_x00e4_tiedot_x0020_ruotsiksi),
                  EN: selfOrEmpty(additionalInfo.Lis_x00e4_tiedot_x0020_englanniksi),
                },
                sharepointId: item.Id,
                type: item.Kategoria,
                locationName: {
                  FI: locFI.name,
                  SV: locSV.name,
                  EN: locEN.name,
                },
                lastModified: item.Modified,
                status: isMandatory(item.Kategoria) ? 'mandatory' : 'searchable',
                startTime: item.Alkuaika,
                endTime: item.Loppuaika,
                gpsLongitude: locFI.gpsLongitude,
                gpsLatitude: locFI.gpsLatitude,
                gridLongitude: locFI.gridLongitude,
                gridLatitude: locFI.gridLatitude,
                subcamp: joinFieldArray(item.Alaleiri, '|'),
                camptroop: '',
                ageGroups: joinFieldArray(item.Ik_x00e4_kausi, '|'),
                wave: joinFieldArray(item.Aalto, '|'),
                source: 1,
              });
            });
          })
          .catch(() => {
            // just catch the error
          });
          promises.push(locPromise);
        });

        Promise.all(promises)
        .then(() =>
          translationUtils.CRUDModels('CalendarEvent', events, 'sharepointId', false, { where: {
            and: [
              { deleted: false },
              { source: 1 },
            ],
          } })
        );
      });
    }
  });

  function getAdditionalInfo(infodata, infoId) {
    return infodata.find(element => (element.Id == infoId) ? true : false);
  }

  function joinFieldArray(field, separator) {
    if (field) {
      return field.results.join(separator);
    }
    return '';
  }

  function isMandatory(category) {
    const mandatoryCategories = [
      'Ruokailu',
      'Päiväohjelma',
      'Iltaohjelma',
    ];
    return (mandatoryCategories.indexOf(category) !== -1) ? true : false;
  }

  function categoryIsForApp(category) {
    const validCategories = [
      'Ruokailu',
      'Päiväohjelma',
      'Iltaohjelma',
      'Tapaaminen',
      'Valinnainen ohjelma',
    ];
    return (validCategories.indexOf(category) !== -1) ? true : false;
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
  const SPProxyUrl = process.env.SP_PROXY_URL;
  return new Promise((resolve, reject) => {

    request.post(`${SPProxyUrl}/readsharepointlist/${listName}`)
    .send({
      username: process.env.SHAREPOINT_USER,
      password: process.env.SHAREPOINT_PSW,
    })
    .end((err, data) => {
      if (err) {
        handler(err, null)
          .then(x => resolve(x))
          .catch(err => reject(err));
      } else {
        handler(err, data.body)
          .then(x => resolve(x))
          .catch(err => reject(err));
      }
    });
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
    .then(() => readSharepointList('Leiriaikataulu', eventsHandler))
    .catch(err => {
      console.log('Sharepoint loader error');
      console.log(err);
    });
  }
}
