var api = require('./api');

var test = require('tape');

test('details api', function (t) {
  api.details('com.viber.voip', function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.end();
  });
});

