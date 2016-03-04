var api = require('./api');

var test = require('tape');

test('details api', function (t) {
  api.bulkDetails(['com.viber.voip', 'air.WatchESPN'], function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.end();
  });
});

