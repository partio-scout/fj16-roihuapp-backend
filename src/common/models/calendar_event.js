import * as translationUtils from '../utils/translations';
import _ from 'lodash';
import * as errorUtils from '../utils/errors';
import Promise from 'bluebird';
import loopback from 'loopback';
import app from '../../server/server';

module.exports = function(CalendarEvent) {

  CalendarEvent.FindTranslations = function(language, filter, textfilter, cb) {
    const ctx = loopback.getCurrentContext();
    const ApiUser = app.models.ApiUser;
    const findUser = Promise.promisify(ApiUser.findById, { context: ApiUser });
    let currentUserId = -1;

    if (ctx.active.accessToken) {   // user is logged in
      currentUserId = ctx.active.accessToken.userId;
    }

    const fields = {
      sharepointId: false,
      source: false,
      wave: false,
      deleted: false,
    };

    if (filter) {
      filter.fields = fields;

      if (!filter.order) {
        filter['order'] = 'startTime ASC';
      }

    } else {
      filter = {
        fields: fields,
        order: 'startTime ASC',
      };
    }

    Promise.join(
      translationUtils.getLangIfNotExists(language),
      findUser(currentUserId),
      (lang, user) => {
        translationUtils.getTranslationsForModel(CalendarEvent, lang, filter)
        .then(translatedEvents => {
          const events = [];
          _.forEach(translatedEvents, event => {
            if (event.status != 'searchable') return;  // skip everything not searchable
            events.push(event);
          });
          return events;
        })
        .then(events => {

          if (textfilter) {
            // create regex to be used
            const regex = new RegExp(`${textfilter}`, 'i');
            // exclude events that don't match textfilter
            events = _.filter(events, evt => {
              if (evt.name.search(regex) == -1 && evt.description.search(regex) == -1) return false;
              else return true;
            });
          }

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
        { arg: 'textfilter', type: 'string', required: false },
      ],
      returns: { type: 'array', root: true },
    }
  );

};

