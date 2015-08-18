import assert from 'assert';
import responseToObj from '../response-to-obj';
import Debug from 'debug';

import request from '../request';
import buildRequestBody from './make-login-request'
import { LoginError } from '../errors';

const debug = Debug('login');

export default async (url, username, password, androidId) => {
  const req = buildRequestBody(username, password, androidId);
  const opts = { method: 'POST', url: url, gzip: true, json: false, form: req };
  debug(req);

  return request(opts).spread((res, body) => {
    if (res.statusCode !== 200) {
      throw new LoginError(body);
    }
    assert(res.headers['content-type'] === 'text/plain; charset=utf-8', 'utf8 string body');

    const response = responseToObj(body);

    if (!response || !response.auth) {
      throw new LoginError('missing auth token in server response');
    }
    debug(response.auth);
    return response.auth;
  });
}
