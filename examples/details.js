var api = require('./common-api-init');

function getAppDetails (pkg) {
  return api.details(pkg).then(function (res) {
    console.log('%j', res);
  });
}

var argv = require('minimist')(process.argv.slice(2));
var pkg = argv._[0] || argv.p || 'com.viber.voip';
getAppDetails(pkg);
