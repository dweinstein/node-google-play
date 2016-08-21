var GooglePlayAPI = require('../lib/api').GooglePlayAPI;
module.exports = GooglePlayAPI({
  username: process.env.GOOGLE_LOGIN,
  password: process.env.GOOGLE_PASSWORD,
  androidId: process.env.ANDROID_ID,
  useCache: false,
  debug: false
});
