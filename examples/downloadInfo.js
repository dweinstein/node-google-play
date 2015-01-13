var GooglePlayAPI = require('../lib/api').GooglePlayAPI;

var use_cache = false;
var debug = false;

function getDownloadInfo(pkg) {

  var api = GooglePlayAPI(
    process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
    process.env.ANDROID_ID,
    use_cache,
    debug
  );

  return api.login()
  .then(function() {
    api.details(pkg).then(function (res) {
      return res.details.appDetails.versionCode;
    })
    .then(function (versionCode) {
      return api.downloadInfo(pkg, versionCode);
    })
    .then(function (info) {
      console.log('%j', info);
    });
  });
}


getDownloadInfo("air.WatchESPN");

