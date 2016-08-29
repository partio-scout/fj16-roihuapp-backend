import fs from 'fs';
import { SAML } from 'passport-saml';
import path from 'path';
import Promise from 'bluebird';
import crypto from 'crypto';

const ACCESS_TOKEN_LIFETIME = 6 * 30 * 24 * 60 * 60;

const useProductionPartioID = process.env.PARTIOID_USE_PRODUCTION === 'true';
const partioIDRemoteName = useProductionPartioID ? 'id' : 'qaid';
const conf = {
  path: '/auth/partioid',
  issuer: process.env.PARTIOID_SP_ISSUER || 'http://localhost:3000',
  entryPoint: `https://${partioIDRemoteName}.partio.fi/simplesaml/saml2/idp/SSOService.php`,
  cert: fs.readFileSync(path.join(__dirname,'..', '..', '..', 'certs', 'partioid', `${partioIDRemoteName}.crt`)).toString(),
};
const partioid = new SAML(conf);

export default function(app) {
  const RoihuUser = app.models.RoihuUser;
  const validatePostResponse = Promise.promisify(partioid.validatePostResponse, { context: partioid });

  function findOrProvisionUser(samlResult) {
    return RoihuUser.findByMemberNumber(samlResult.membernumber).then(user =>
      user || RoihuUser.create({
        firstname: samlResult.firstname,
        lastname: samlResult.lastname,
        email: samlResult.email,
        memberNumber: samlResult.membernumber,
        password: crypto.randomBytes(24).toString('hex'),
        lastModified: new Date(),
      })
    );
  }

  function generateAccessToken(user) {
    return user.createAccessToken(ACCESS_TOKEN_LIFETIME);
  }

  app.get('/saml/login', (req, res) =>
    partioid.getAuthorizeUrl(req, (err, url) => {
      if (err) {
        res.status(500).send('Oho! Nyt tapahtui virhe. Jos tällaista tapahtuu uudelleen, ole yhteydessä support@example.com. Sori! :(');
        console.error((new Date()), err);
      } else {
        res.redirect(url);
      }
    })
  );

  app.post('/saml/consume', (req, res) => {
    validatePostResponse(req.body)
      .then(findOrProvisionUser)
      .then(generateAccessToken)
      .then(token => res.redirect(`roihu://${token.userId}/${token.id}`))
      .catch(err => {
        res.status(500).send('Oho, nyt tapahtui virhe. Tämä voi johtua siitä ettei sinulla ole Kuksassa sähköpostiosoitetta, tai appiin on jo kirjauduttu käyttäen Kuksasta tulevaa sähköpostiosoitetta. Varmista että Kuksasta lyötyy sähköpostiosoite ja ettei sähköpostilla ole jo yritetty tehdä tunnusta. Tiedot päivittyvät Kuksasta muutaman tunnin välein. Jos tällaista tapahtuu uudelleen, ole yhteydessä support@example.com. Pahoittelut häiriöstä.');
        console.error((new Date()), err);
      });
  });
}
