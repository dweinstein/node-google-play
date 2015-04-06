var api = require('./api');

var test = require('tape');

test('downloadInfo api', function (t) {
  api.downloadInfo('com.viber.voip', 37, function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.end();
  });
});

