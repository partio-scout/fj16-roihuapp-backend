module.exports = function mountLoopBackExplorer(server) {

  if (process.env.NODE_ENV !== 'dev') {
    return;
  }

  let explorer = null;
  try {
    explorer = require('loopback-component-explorer');
  } catch (err) {
    // Print the message only when the app was started via `server.listen()`.
    // Do not print any message when the project is used as a component.
    server.once('started', baseUrl => {
      console.log(
        'Run `npm install loopback-explorer` to enable the LoopBack explorer'
      );
    });
    return;
  }

  const restApiRoot = server.get('restApiRoot');

  const explorerApp = explorer.routes(server, { basePath: restApiRoot });
  server.use('/explorer', explorerApp);
  server.once('started', () => {
    const baseUrl = server.get('url').replace(/\/$/, '');
    console.log('Browse your REST API at %s/explorer', baseUrl);
  });
};
