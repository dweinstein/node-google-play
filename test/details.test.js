var test = require('tape');
var api = require('./api');
var RequestError = require('../lib/errors').RequestError;

test('details api', function (t) {
  t.plan(2);
  api.details('com.viber.voip', function (err, res) {
    t.notOk(err, 'no error');
    t.ok(res, 'returned results');
  });
});

test('details api - Item not found', function (t) {
  t.plan(5);
  api.details('foo.i123.probably.dont.exist.bar', function (err, res) {
    t.ok(err instanceof RequestError, 'RequestError');
    t.ok(err, 'error');
    t.notOk(res, 'results');
    t.ok(err.message = 'Item not found', 'error msg');
    t.equal(err.statusCode, 404, 'status code');
  });
});
