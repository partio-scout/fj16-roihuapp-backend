import * as translationUtils from '../utils/translations';
import _ from 'lodash';
import * as errorUtils from '../utils/errors';

module.exports = function(CalendarEvent) {

  CalendarEvent.FindTranslations = function(language, cb) {

    translationUtils.getLangIfNotExists(language)
      .then(lang => {
        translationUtils.getTranslationsForModel(CalendarEvent, lang)
          .then(translatedEvents => {
            const events = [];
            _.forEach(translatedEvents, event => {
              events.push({
                id: event.eventId,
                title: event.name,
                bodytext: event.description,
                type: event.type,
                gps_latitude: event.gpsLatitude,
                gps_longitude: event.gpsLongitude,
                grid_latitude: event.gridLatitude,
                grid_longitude: event.gridLongitude,
                locationName: event.locationName,
                status: event.status,
                startTime: event.startTime,
                endTime: event.endTime,
                subcamp: event.subcamp,
                ageGroups: event.ageGroups,
                participantCount: event.participantCount,
                last_modified: event.lastModified,
              });
            });
            return events;
          })
          .then(events => {
            const timeNow = new Date();
            const timeNext = new Date(timeNow);
            timeNext.setHours(timeNow.getHours() + 1);

            const response = {
              timestamp: timeNow.toISOString(),
              next_check: timeNext.toISOString(),
              language: lang,
              events: events,
            };

            cb(null, response);

          })
          .catch(err => {
            cb(errorUtils.createHTTPError('Something went wrong', 500, err.message), null);
            return;
          });
      });
  };

  CalendarEvent.remoteMethod(
    'FindTranslations',
    {
      http: { path: '/translations', verb: 'get' },
      accepts: [
        { arg: 'lang', type: 'string', http: { source: 'query' }, required: false },
      ],
      returns: { type: 'array', root: true },
    }
  );

};

