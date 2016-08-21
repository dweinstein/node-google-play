var api = require('./common-api-init');

function getDownloadInfo(pkg) {
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

