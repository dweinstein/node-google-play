var api = require('./common-api-init');

var argv = require('minimist')(process.argv.slice(2));

var pkg = argv._[0] || argv.p || 'com.viber.voip';

api.reviews(pkg).then(function (reviews) {
  console.log('%j', reviews);
});
