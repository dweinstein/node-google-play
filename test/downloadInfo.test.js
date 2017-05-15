var api = require('./api');
var test = require('tap').test;
var AppNotFreeError = require('../lib/errors').AppNotFreeError;
var RequestError = require('../lib/errors').RequestError;

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
