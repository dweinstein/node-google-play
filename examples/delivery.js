var api = require('./common-api-init');

function getDeliveryData (pkg) {
  return api.login()
    .then(function () {
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

var argv = require('minimist')(process.argv.slice(2));
var pkg = argv._[0] || argv.p || 'com.viber.voip';
getDeliveryData(pkg);
