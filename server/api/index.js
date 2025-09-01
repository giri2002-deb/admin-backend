const serverless = require('serverless-http');
const app = require('.'); // path to your Express app

module.exports = serverless(app);