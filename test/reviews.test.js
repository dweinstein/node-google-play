var api = require('./api');

var test = require('tap').test;

test('review api', function (t) {
  api.reviews('com.viber.voip', 20, 20, function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.end();
  });
});
