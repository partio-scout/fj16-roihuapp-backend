import fs from 'fs';
import { SAML } from 'passport-saml';
import path from 'path';
import Promise from 'bluebird';
import crypto from 'crypto';

const ACCESS_TOKEN_LIFETIME = 14 * 24 * 60 * 60;

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
        res.status(500).send('Oho! Nyt tapahtui virhe. Jos tällaista tapahtuu uudelleen, ole yhteydessä digitaaliset.palvelut@roihu2016.fi. Sori! :(');
        console.error(err);
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
        res.status(500).send('Oho! Nyt tapahtui virhe. Jos tällaista tapahtuu uudelleen, ole yhteydessä digitaaliset.palvelut@roihu2016.fi. Sori! :(');
        console.error(err);
      });
  });
}
