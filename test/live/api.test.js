import test from 'tape';
import getToken from '../../lib/login/get-auth-token';
import {URL_LOGIN as url} from '../../lib/constants';
import {LoginError} from '../../lib/errors';
import creds from '../util/creds';
import api from '../util/api';
import { pluck } from 'lodash';

test('get auth token', async (t) => {
  t.plan(1);
  var token = await getToken(url, creds.username, creds.password, creds.androidId);
  t.assert(token.length > 0, 'token length');
})

test('logged in', async (t) => {

  test('api auth', async (t) => {
    t.plan(1);
    const token = await api.auth(creds);
    t.assert(token.length > 0, 'token length');
  })

  test('details', async (t) => {
    t.plan(3);
    const resp = await api.details('com.viber.voip');
    t.ok(resp, 'got response');
    t.equal(resp.details.appDetails.packageName, 'com.viber.voip', 'package name matches');
    t.equal(resp.docid, 'com.viber.voip', 'docid matches');
  });

  test('bulkDetails', async (t) => {
    t.plan(2);
    const resp = await api.bulkDetails(['com.viber.voip', 'air.WatchESPN']);
    t.ok(resp, 'got response');
    t.deepEqual(pluck(resp, 'docid'), ['com.viber.voip', 'air.WatchESPN'], 'docids match');
  });

  test('related', async (t) => {
    t.plan(3);
    const resp = await api.related('com.viber.voip');
    t.ok(resp, 'got response');
    t.assert(resp.length > 0, 'response with values')
    t.assert(resp[0].docid, 'response has docid');
  });

  test('search', async (t) => {
    t.plan(3);
    const resp = await api.search('viber', {});
    t.ok(resp, 'got response');
    t.assert(resp.length > 0, 'response with values')
    t.assert(resp[0].docid, 'response has docid');
  });

  test('delivery', async (t) => {
    t.plan(1);
    const info = await api.details('com.viber.voip');
    const vc = info.details.appDetails.versionCode;
    const resp = await api.delivery('com.viber.voip', vc);
    debugger;
    t.ok(resp, 'got response');
    //t.assert(resp.length > 0, 'response with values')
    //t.assert(resp[0].docid, 'response has docid');
  });

  t.end();
});

