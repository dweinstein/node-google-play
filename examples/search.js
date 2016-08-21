var api = require('./common-api-init');

function search (term, n, offset) {
  return api.search(term, n, offset).then(function (res) {
    console.log('%j', res);
  });
}

var argv = require('minimist')(process.argv.slice(2));
var term = argv._[0] || argv.q || 'flashlight';
var n = argv._[1] || argv.n;
var offset = argv._[2] || argv.o;
search(term, n, offset);
