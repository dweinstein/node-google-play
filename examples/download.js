var GooglePlayAPI = require('../lib/api').GooglePlayAPI;

var use_cache = false;
var debug = false;

var fs = require('fs');

function downloadToFile(pkg, vc) {

  var api = GooglePlayAPI(
    process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
    process.env.ANDROID_ID,
    use_cache,
    debug
  );

  return api.details(pkg).then(function (res) {
    return vc || res.details.appDetails.versionCode;
  })
  .then(function (versionCode) {
    var fStream = fs.createWriteStream(pkg+'.apk');
    return api.download(pkg, versionCode).then(function (res) {
      res.pipe(fStream);
    });
  });
}


var argv = require('minimist')(process.argv.slice(2));
var pkg = argv._[0] || argv.p || "com.MediaConverter";
var vc = argv._[1] || argv.v;
downloadToFile(pkg, vc);

