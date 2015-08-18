import cleanup from '../lib/protocol/remove-empty-values';
import test from 'tape';

test('cleanup protocol message', (t) =>{
  t.plan(4)
  const first = {
    foo: {
      bar: null,
      baz: 0
    },
    baz: {
      qux: 'ok'
    },
    keep: null,
    stay: false
  }
  cleanup(first);
  t.deepEqual(first, {
    stay: false,
    foo: { baz: 0 },
    baz: { qux: 'ok'},
  }, 'cleans empty fields');
  t.equal(first.baz.qux, 'ok', 'ok');
  t.equal(first.foo.baz, 0, 'zero');
  t.equal(first.stay, false, 'zero');
});
