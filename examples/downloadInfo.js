var api = require('./common-api-init');

function getDownloadInfo (pkg, vc) {
  return api.login()
    .then(function () {
      api.details(pkg).then(function (res) {
        return res.details.appDetails.versionCode;
      })
        .then(function (versionCode) {
          if (vc) {
            return api.downloadInfo(pkg, vc);
          } else {
            return api.downloadInfo(pkg, versionCode);
          }
        })
        .then(function (info) {
          console.log('%j', info);
        });
    });
}

getDownloadInfo(process.argv[2] || 'air.WatchESPN', process.argv[3]);
