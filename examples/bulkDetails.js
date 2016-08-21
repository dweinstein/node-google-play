var api = require('./common-api-init');

function getBulkDetails(pkgs) {
  return api.login()
  .then(function() {
    api.bulkDetails(pkgs).then(function (res) {
      console.log('%j', res);
    });
  });
}

var argv = require('minimist')(process.argv.slice(2));
getBulkDetails(argv._ || ['com.viber.voip', 'air.WatchESPN']);

