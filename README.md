# Roihuapp backend

Finnjamboree 2016 mobile application backend

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

## Environment variaples to be able to use all features of the app:

### User login with only email

AWS_SES_USER - aws-ses username
AWS_SES_PASS - aws-ses password

### Sharepoint integration

SHAREPOINT_USER - sharepoint username
SHAREPOINT_PSW  - sharepoint password

## Running the app

Start server with `npm start`

You can enable dev settings and api explorer with `NODE_ENV=dev npm start`

## Valid endpoints

All GET requests should use lang parameter like `LocationCategories/translations?lang=FI`

#### Achievements

* User completed achievements -> GET api/RoihuUsers/{id}/completedAchievements
* Mark achievement completed -> PUT api/RoihuUsers/{id}/achievements/rel/{fk}
* Mark achievement un-completed -> DELETE api/RoihuUsers/{id}/achievements/rel/{fk}
* All achievements -> GET api/AchievementCategories/translations

#### Locations

* All Locations -> GET api/LocationCategories/translations
    * use param `afterDate` with javascript ISO formatted date to get articles after that date. There is five minute "safezone" before that. (Date format: `2016-05-23T13:10:08.553Z`)

#### Instructions

* All instructions -> GET api/InstructionCategories/translations
    * use param `afterDate` with javascript ISO formatted date to get articles after that date. There is five minute "safezone" before that. (Date format: `2016-05-23T13:10:08.553Z`)

#### Users

* Login -> POST api/RoihuUsers/login
* Logout ->  POST api/RoihuUsers/logout
* Email login -> POST api/RoihuUsers/emailLogin
* Saml login -> POST saml/login
