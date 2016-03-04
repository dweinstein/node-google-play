var api = require('./api');

var test = require('tape');

test('details api', function (t) {
  var pkgs = ['com.viber.voip', 'air.WatchESPN'];
  api.bulkDetails(pkgs, function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.equal(res.length, 2, 'returned two results');
    t.deepEqual(res.map(function (d) { return d.docid; }), pkgs, 'returned results for pkgs');
    t.end();
  });
});

