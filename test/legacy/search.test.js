var api = require('./api');

var test = require('tape');

test('search api', function (t) {
  api.search('viber', function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.end();
  });
});

