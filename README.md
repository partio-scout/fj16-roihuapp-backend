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


