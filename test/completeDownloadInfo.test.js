var api = require('./api');
var test = require('tap').test;
var AppNotFreeError = require('../lib/errors').AppNotFreeError;
var RequestError = require('../lib/errors').RequestError;

test('completeDownloadInfo api', function (t) {
  t.plan(8);
  api.completeDownloadInfo('com.viber.voip', 37, function (err, res) {
    t.false(err, 'no error');
    t.ok(res, 'returned results');

    t.ok(res.hasOwnProperty('url'), 'url in response');
    t.ok(res.url.indexOf('com.viber.voip') > -1, 'package name should be in response url');

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
