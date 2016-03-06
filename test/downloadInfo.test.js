var api = require('./api');
var test = require('tape');
var AppNotFreeError = require('../lib/errors').AppNotFreeError;

test('downloadInfo api', function (t) {
  t.plan(7);
  api.downloadInfo('com.viber.voip', 37, function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
  });
  setTimeout(function () {
    api.downloadInfo('com.mojang.minecraftpe', 740140009, function (err, res) {
      t.ok(err, 'error expected');
      t.ok(err instanceof AppNotFreeError, 'error instanceof AppNotFreeError');
      t.ok(err.name === 'AppNotFreeError', 'error.name is AppNotFreeError');
      t.ok(err.price, 'error has price');
      t.notOk(res, 'no results');
      t.comment('price: ' + err.price);
    });
  }, 1500);
});

