# Mobile application backend

Finnjamboree 2016 mobile application backend. All content types support unlimited amount of different language versions.

# Development

## Prequisities

Node.JS and PostgreSQL

## Installation

Clone this repository.

Make sure your postgreSQL instance is running and make sure that you have a postgreSQL user and database for that user.

Set database settings as environment variable:
    
    For runnig the app normally
    `export DATABASE_URL=postgres://username:password@host:port/databasename`

    For running tests for the app
    `export TEST_DATABASE_URL=postgres://username:password@host:port/databasename`

Install all dependencies:
    `npm install`

## Environment variables to be able to use all features of the app:

### User login with only email

AWS_SES_USER - aws-ses username
AWS_SES_PASS - aws-ses password

## Running the app

Start server with `npm start`

You can enable dev settings and api explorer with `NODE_ENV=dev npm start`

## Valid endpoints

All GET requests should use lang parameter like `LocationCategories/translations?lang=FI`

#### Achievements

* User completed achievements -> GET api/ApiUsers/{id}/completedAchievements
* Mark achievement completed -> PUT api/ApiUsers/{id}/achievements/rel/{fk}
* Mark achievement un-completed -> DELETE api/ApiUsers/{id}/achievements/rel/{fk}
* All achievements -> GET api/AchievementCategories/translations

#### Locations

* All Locations -> GET api/LocationCategories/translations
    * use param `afterDate` with javascript ISO formatted date to get articles after that date. There is five minute "safezone" before that. (Date format: `2016-05-23T13:10:08.553Z`)

#### Instructions

* All instructions -> GET api/InstructionCategories/translations
    * use param `afterDate` with javascript ISO formatted date to get articles after that date. There is five minute "safezone" before that. (Date format: `2016-05-23T13:10:08.553Z`)

#### Calendar and events

* Events search -> GET api/CalendarEvents/translations
    * to filter results use loopback filters https://docs.strongloop.com/display/public/LB/Querying+data 
    * `include` filter may result in unwanted behavior
    * `fields` filter will be overwritten
    * use `textfilter` param to search text from name and description
* Users calendar -> GET api/ApiUsers/{id}/calendar
* Add event to calendar -> PUT api/ApiUsers/{id}/calendarEvents/rel/{fk}
* remove event from calendar -> DELETE api/ApiUsers/{id}/calendarEvents/rel/{fk}
* Submit new event -> POST api/CalendarEvents

#### Users

* Login -> POST api/ApiUsers/login
* Logout ->  POST api/ApiUsers/logout
* Email login -> POST api/ApiUsers/emailLogin
* Saml login -> POST saml/login
