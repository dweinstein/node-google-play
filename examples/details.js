var api = require('./common-api-init');

function getAppDetails (pkg) {
  return api.details(pkg).then(function (res) {
    console.log(JSON.stringify(res, null, 4));
  });
}

var argv = require('minimist')(process.argv.slice(2));
var pkg = argv._[0] || argv.p || 'com.viber.voip';
getAppDetails(pkg);
