var api = require('./api');
var test = require('tape');
var AppNotFreeError = require('../lib/errors').AppNotFreeError;
var RequestError = require('../lib/errors').RequestError;

test('downloadInfo api', function (t) {
  t.plan(2);
  api.downloadInfo('com.viber.voip', 37, function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
  });
});

test('downloadInfo api - Paid apps', function (t) {
  t.plan(5);
  api.downloadInfo('com.mojang.minecraftpe', 740140009, function (err, res) {
    t.ok(err, 'error expected');
    t.ok(err instanceof AppNotFreeError, 'error instanceof AppNotFreeError');
    t.ok(err.name === 'AppNotFreeError', 'error.name is AppNotFreeError');
    t.ok(err.price, 'error has price');
    t.notOk(res, 'no results');
    t.comment('price: ' + err.price);
  });
});

test('downloadInfo api - Item not found ', function (t) {
  t.plan(5);
  api.downloadInfo('i.should.probably.not.exist', 25, function (err, res) {
    t.ok(err instanceof RequestError, 'RequestError');
    t.ok(err, 'error returned');
    t.notOk(res, 'no response');
    t.ok(err.message = 'Item not found', 'error msg');
    t.equal(err.statusCode, 403, 'status code');
  });
});

