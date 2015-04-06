var GooglePlayAPI = require('../lib/api').GooglePlayAPI;

var use_cache = false;
var debug = false;

function search(term, n, offset) {
  var api = GooglePlayAPI(
    process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
    process.env.ANDROID_ID,
    use_cache,
    debug
  );

  return api.search(term, n, offset).then(function (res) {
    console.log('%j', res);
  });
}

var argv = require('minimist')(process.argv.slice(2));
var term = argv._[0] || argv.q;
var n = argv._[1] || argv.n;
var offset = argv._[2] || argv.o;
search(term, n, offset);

