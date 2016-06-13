import * as translationUtils from '../utils/translations';
import _ from 'lodash';
import * as errorUtils from '../utils/errors';
import Promise from 'bluebird';
import loopback from 'loopback';
import app from '../../server/server';

module.exports = function(CalendarEvent) {

  CalendarEvent.FindTranslations = function(language, filter, cb) {
    const ctx = loopback.getCurrentContext();
    const RoihuUser = app.models.RoihuUser;
    const findUser = Promise.promisify(RoihuUser.findById, { context: RoihuUser });
    let currentUserId = -1;

    if (ctx.active.accessToken) {   // user is logged in
      currentUserId = ctx.active.accessToken.userId;
    }

    Promise.join(
      translationUtils.getLangIfNotExists(language),
      findUser(currentUserId),
      (lang, user) => {
        translationUtils.getTranslationsForModel(CalendarEvent, lang, {
          where: filter.where,
          fields: {
            sharepointId: false,
            source: false,
            wave: false,
            deleted: false,
            status: false,
            type: false,
          },
        })
        .then(translatedEvents => {
          const events = [];
          _.forEach(translatedEvents, event => {
            if (event.status !== 'searchable') return;  // skip everything not searchable
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
              wave: event.wave,
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

  CalendarEvent.addOrReduceParticipants = function(amount, eventId) {
    const findEvent = Promise.promisify(CalendarEvent.findOne, { context: CalendarEvent });

    return findEvent({
      where: { eventId: eventId },
    }).then(event => {
      event.updateAttribute('participantCount', event.participantCount + amount);
    });
  };

  CalendarEvent.remoteMethod(
    'FindTranslations',
    {
      http: { path: '/translations', verb: 'get' },
      accepts: [
        { arg: 'lang', type: 'string', http: { source: 'query' }, required: false },
        { arg: 'filter', type: 'object', required: false },
      ],
      returns: { type: 'array', root: true },
    }
  );

};

