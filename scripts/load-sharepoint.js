import app from '../src/server/server';
import Promise from 'bluebird';
import _ from 'lodash';
import * as translationUtils from '../src/common/utils/translations';

export function loadLocations() {
  const LocationCategory = app.models.LocationCategory;
  const Location = app.models.Location;
  const findOrCreateLocationCategory = Promise.promisify(LocationCategory.findOrCreate, { context: LocationCategory });
  const findOrCreateLocation = Promise.promisify(Location.findOrCreate, { context: Location });
  const sharepoint = require('sharepointconnector')({
    username : process.env.SHAREPOINT_USER,
    password : process.env.SHAREPOINT_PSW,
    // Authentication type - current valid values: ntlm, basic, online,onlinesaml 
    type : 'online',
    url : 'https://partio.sharepoint.com',
    context : 'roihu/tyokalut',
  });
  sharepoint.login(function(err){
    if (err){
      return console.error(err);
    }
    const categories = [];
    const catNames = [];
    const locations = [];

    let categoryIndex = 1;
    let categorySortNo = 1;
    let locIndex = 1;
    let locSortNo = 1;

    // Load 'Paikat' list from sharepoint
    sharepoint.listItems.list('Paikat', (err, data) => {
      if (err) console.error(err);
      _.forEach(data, item => {
        const categoryObj = {
          'name': {
            'FI': item.Kategoria,
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
          },
          'description': {
            'FI': item.Kuvaus || '',
          },
          'sortNo': locSortNo++,
          'idFromSource': locIndex++,
          'categoryId': cIndexNum + 1,
          'gpsLatitude': item.Latitude,
          'gpsLongitude': item.Longitude,
          'gridLatitude': item.Koordinaattiruutu.substring(0,1),
          'gridLongitude': item.Koordinaattiruutu.substring(1,3),
        });
      });
/*
      console.log('G_----------------------------');
      console.log(categories);
      console.log('LOC_----------------------------');
      console.log(locations);
*/
      translationUtils.createTranslationsForModel('LocationCategory', categories).then(cr => {
        console.log(cr);
      });
      translationUtils.createTranslationsForModel('Location', locations).then(loc => {
        console.log(loc);
      });

    });
  });
}

function isInArray(obj, arr) {
  let i;
  for (i = 0; i < arr.length; i++) {
    if(arr[i] == obj) return true;
  }
  return false;
}

if (require.main === module) {
  loadLocations();
}