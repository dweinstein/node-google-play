var api = require('./common-api-init');
var fs = require('fs');

function downloadToFile (pkg, vc) {
  return api.details(pkg).then(function (res) {
    return vc || res.details.appDetails.versionCode;
  })
    .then(function (versionCode) {
      var fStream = fs.createWriteStream(pkg + '.apk');
      return api.download(pkg, versionCode).then(function (res) {
        res.pipe(fStream);
      });
    });
}

var argv = require('minimist')(process.argv.slice(2));
var pkg = argv._[0] || argv.p || 'com.MediaConverter';
var vc = argv._[1] || argv.v;
downloadToFile(pkg, vc);
