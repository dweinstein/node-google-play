
var use_cache = false;
var debug = false;

var api = require('../lib/api').GooglePlayAPI(
  process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
  process.env.ANDROID_ID,
  use_cache,
  debug
);

function unescape (str) {
  return (str + Array(5 - str.length % 4).join('=')).replace(/\-/g,'+').replace(/_/g, '/');
}

function decode_digest (str) {
  return new Buffer(unescape(str), 'base64').toString('hex');
}

function getDeliveryDataVc(pkg, vc) {
  return api.deliveryData(pkg, vc)
  .then(function (info) {
    return signatureToSha1(info.signature);
  });
}

function signatureToSha1(sig) {
  return decode_digest(sig);
}

var argv = require('minimist')(process.argv.slice(2));
var pkg = argv._[0] || argv.p || "com.MediaConverter";
var vc = argv._[1] || argv.v;

return api.details(pkg)
.then(function (res) {
  vc = vc || res.details.appDetails.versionCode;
  return getDeliveryDataVc(pkg, vc)
  .then(function (res) {
    console.log('%j', [pkg, vc, res]);
  });
});


