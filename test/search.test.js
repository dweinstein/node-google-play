var api = require('./api');

var test = require('tap').test;

test('search api', function (t) {
  t.plan(2);
  api.search('viber', function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
  });
});
