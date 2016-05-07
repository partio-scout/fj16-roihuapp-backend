export default function(app) {
  app.get('/emailredirect/:userId/:accessToken', (req, res) => {
    if (!req.params.userId || !req.params.accessToken) {
      res.status(500).send('Invalid user!');
    } else {
      res.redirect(`roihu://${req.params.userId}/${req.params.accessToken}`);
    }
  });
}
