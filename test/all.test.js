var lookupRestriction = require('../lib/lookup-restriction');
var AppNotFreeError = require('../lib/errors').AppNotFreeError;
var RequestError = require('../lib/errors').RequestError;

var api = require('./api');
var test = require('tap').test;

test('details api', function (t) {
  var pkgs = ['com.viber.voip', 'air.WatchESPN'];
  t.plan(4);
  api.bulkDetails(pkgs, function (err, res) {
    t.false(err, 'no error');
    t.ok(res, 'returned results');
    t.equal(res.length, 2, 'returned two results');
    t.deepEqual(res.map(function (d) { return d.docid; }), pkgs, 'returned results for pkgs');
  });
});

test('bulkDetails api - missing packages', function (t) {
  var pkgs = ['com.viber.voip', 'com.foo.bar.i.dont.exist.ok.123'];
  t.plan(5);
  api.bulkDetails(pkgs, function (err, res) {
    t.false(err, 'no error');
    t.ok(res, 'returned results');
    t.equal(res.length, 2, 'returned two results');
    t.equal(res[0].docid, 'com.viber.voip', 'first result');
    t.false(res[1], 'second result');
  });
});

test('completeDownloadInfo api', function (t) {
  t.plan(7);
  api.completeDownloadInfo('com.viber.voip', 37, function (err, res) {
    t.false(err, 'no error');
    t.ok(res, 'returned results');

    t.ok(res.hasOwnProperty('url'), 'url in response');

    t.ok(res.hasOwnProperty('jar'), 'response should have cookie jar');

    t.ok(res.hasOwnProperty('headers'), 'response has headers');
    t.ok(res.headers.hasOwnProperty('User-Agent'), 'User-Agent in response headers');
    t.ok(res.headers.hasOwnProperty('Accept-Encoding'), 'Accept-Encoding in response headers');
  });
});

// TODO: fix this test
test('completeDownloadInfo api - Paid apps', { skip: true }, function (t) {
  t.plan(5);
  api.completeDownloadInfo('com.mojang.minecraftpe', 740140009, function (err, res) {
    t.ok(err, 'error expected');
    t.ok(err instanceof AppNotFreeError, 'error instanceof AppNotFreeError');
    t.ok(err.name === 'AppNotFreeError', 'error.name is AppNotFreeError');
    t.ok(err.price, 'error has price');
    t.false(res, 'no results');
    t.comment('price: ' + err.price);
  });
});

test('completeDownloadInfo api - Item not found ', function (t) {
  t.plan(5);
  api.completeDownloadInfo('i.should.probably.not.exist', 25, function (err, res) {
    t.ok(err instanceof RequestError, 'RequestError');
    t.ok(err, 'error returned');
    t.false(res, 'no response');
    t.ok(err.message = 'Item not found', 'error msg');
    t.equal(err.statusCode, 403, 'status code');
  });
});

test('details api', function (t) {
  t.plan(6);
  api.details('com.viber.voip', function (err, res) {
    t.false(err, 'no error');
    t.ok(res, 'returned results');
    t.ok(res.details, 'details');
    t.ok(res.details.appDetails, 'appDetails');
    t.ok(res.details.appDetails.packageName, 'packageName');
    t.ok(res.details.appDetails.versionCode, 'versionCode');
  });
});

test('details api - Item not found', function (t) {
  t.plan(5);
  api.details('foo.i123.probably.dont.exist.bar', function (err, res) {
    t.ok(err instanceof RequestError, 'RequestError');
    t.ok(err, 'error');
    t.false(res, 'results');
    t.ok(err.message = 'Item not found', 'error msg');
    t.equal(err.statusCode, 404, 'status code');
  });
});

test('downloadInfo api', function (t) {
  t.plan(7);
  api.downloadInfo('com.viber.voip', 120263, function (err, res) {
    t.false(err, 'no error');
    t.ok(res, 'returned results');
    t.type(res, 'object', 'returned object');
    t.ok(res.signature, 'signature');
    t.ok(res.downloadSize, 'downloadSize');
    t.ok(res.downloadUrl, 'downloadUrl');
    t.ok(res.downloadAuthCookie, 'downloadAuthCookie');
  });
});

// TODO: fix this test
test('downloadInfo api - Paid apps', { skip: true }, function (t) {
  t.plan(5);
  api.downloadInfo('com.mojang.minecraftpe', 740140009, function (err, res) {
    t.ok(err, 'error expected');
    t.ok(err instanceof AppNotFreeError, 'error instanceof AppNotFreeError');
    t.ok(err.name === 'AppNotFreeError', 'error.name is AppNotFreeError');
    t.ok(err.price, 'error has price');
    t.false(res, 'no results');
    t.comment('price: ' + err.price);
  });
});

test('downloadInfo api - Item not found ', function (t) {
  t.plan(5);
  api.downloadInfo('i.should.probably.not.exist', 25, function (err, res) {
    t.ok(err instanceof RequestError, 'RequestError');
    t.ok(err, 'error returned');
    t.false(res, 'no response');
    t.ok(err.message = 'Item not found', 'error msg');
    t.equal(err.statusCode, 403, 'status code');
  });
});

test('additional file download info', { bail: true }, function (t) {
  t.plan(5);
  api.additionalFileCompleteDownloadInfo('com.rovio.baba', 2080017, 0, function (err, res) {
    t.false(err, 'no error');
    t.ok(res, 'returned results');
    t.ok(res.url, 'returned url');
    t.ok(res.headers, 'returned headers');
    t.ok(typeof res.jar !== 'undefined', 'returned cookies');
  });
});

test('lookup restriction', function (t) {
  test('0', function (t) {
    t.ok(lookupRestriction(0), 'valid restriction');
    t.end();
  });
  test('1', function (t) {
    t.notOk(lookupRestriction(1), 'invalid restriction');
    t.end();
  });
  t.end();
});

test('review api', function (t) {
  api.reviews('com.viber.voip', 20, 0, function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
    t.end();
  });
});

test('search api', function (t) {
  t.plan(2);
  api.search('viber', function (err, res) {
    t.false(err, 'no error');
    t.ok(res, 'returned results');
  });
});
