var api = require('./api');

var test = require('tap').test;

test('details api', function (t) {
  var pkgs = ['com.viber.voip', 'air.WatchESPN'];
  t.plan(4);
  api.bulkDetails(pkgs, function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.equal(res.length, 2, 'returned two results');
    t.deepEqual(res.map(function (d) { return d.docid; }), pkgs, 'returned results for pkgs');
  });
});

test('bulkDetails api - missing packages', function (t) {
  var pkgs = ['com.viber.voip', 'com.foo.bar.i.dont.exist.ok.123'];
  t.plan(5);
  api.bulkDetails(pkgs, function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.equal(res.length, 2, 'returned two results');
    t.equal(res[0].docid, 'com.viber.voip', 'first result');
    t.notOk(res[1], 'second result');
  });
});
