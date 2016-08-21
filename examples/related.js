var api = require('./common-api-init');

function getRelatedApps (pkg) {
  return api.login()
    .then(function () {
      api.related(pkg).then(function (res) {
        console.log('%j', res);
      });
    });
}

getRelatedApps('com.viber.voip');
