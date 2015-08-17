const lookupRestriction = require('../lib/lookup-restriction');
var test = require('tape');

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
