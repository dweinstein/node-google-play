import makeRequest from '../lib/login/make-login-request';
import test from 'tape';

test('login request created', (t) => {
  t.plan(1);
  var req = makeRequest('com', 'foo', 123);
  t.ok(req);
  t.end();
});
