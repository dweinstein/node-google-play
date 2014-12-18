var GooglePlayAPI = require('../lib/api').GooglePlayAPI;

var use_cache = false;
var debug = false;

function getAppDetails(pkg) {
  var api = GooglePlayAPI(
    process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
    process.env.ANDROID_ID,
    use_cache,
    debug
  );

  return api.details(pkg).then(function (res) {
    console.log('%j', res);
  });
}

getAppDetails("com.viber.voip");

