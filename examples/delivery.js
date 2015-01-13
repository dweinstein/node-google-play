var GooglePlayAPI = require('../lib/api').GooglePlayAPI;

var use_cache = false;
var debug = false;

var api = GooglePlayAPI(
  process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
  process.env.ANDROID_ID,
  use_cache,
  debug
);

function getDeliveryData(pkg) {
  return api.login()
  .then(function() {
    api.details(pkg).then(function (res) {
      return res.details.appDetails.versionCode;
    })
    .then(function (versionCode) {
      return api.deliveryData(pkg, versionCode);
    })
    .then(function (info) {
      console.log('%j', info);
    });
  });
}

function getDeliveryDataVc(pkg, vc) {
  return api.login()
  .then(function() {
    return api.deliveryData(pkg, vc);
  })
  .then(function (info) {
    console.log('%j', info);
  });
}

//getDeliveryData("air.WatchESPN");
getDeliveryDataVc("com.MediaConverter", 6);

