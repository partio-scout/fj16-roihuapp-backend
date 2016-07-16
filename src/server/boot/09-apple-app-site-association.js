import fs from 'fs';
import path from 'path';

export default function(app) {
  const aasa = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'apple-app-site-association.json'));
  app.get('/apple-app-site-association', (req, res) => {
    res.set('Content-Type', 'application/pkcs7-mime');
    res.status(200).send(aasa);
  });
}
