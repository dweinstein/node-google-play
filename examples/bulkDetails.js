var GooglePlayAPI = require('../lib/api').GooglePlayAPI;

var use_cache = false;
var debug = false;

function getBulkDetails(pkgs) {
  var api = GooglePlayAPI(
    process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
    process.env.ANDROID_ID,
    use_cache,
    debug
  );

  return api.login()
  .then(function() {
    api.bulkDetails(pkgs).then(function (res) {
      console.log('%j', res);
    });
  });
}

getBulkDetails(['com.viber.voip', 'air.WatchESPN']);

