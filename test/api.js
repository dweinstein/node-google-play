var GooglePlayAPI = require('../lib/api').GooglePlayAPI;

var use_cache = false;
var debug = false;

module.exports = GooglePlayAPI(
  process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
  process.env.ANDROID_ID,
  use_cache,
  debug
);

