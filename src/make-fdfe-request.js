import xtend from 'xtend';
import {format as fmt} from 'util';
import {
  ACCEPT_LANGUAGE, ENABLED_EXPERIMENTS, UNSUPPORTED_EXPERIMENTS, CLIENT_ID, USER_AGENT
} from './constants';
import rc from './config';
import { RequestError } from './errors';
import assert from 'assert';
import Debug from 'debug';
import { method } from 'bluebird';
import request from './request';

const debug = Debug('make-fdfe-request');

const DEFAULT_HEADERS = {
  "Accept-Language": ACCEPT_LANGUAGE,
  "X-DFE-Enabled-Experiments": ENABLED_EXPERIMENTS.join(","),
  "X-DFE-Unsupported-Experiments": UNSUPPORTED_EXPERIMENTS.join(","),
  "X-DFE-Client-Id": CLIENT_ID,
  "User-Agent": USER_AGENT,
  "X-DFE-SmallestScreenWidthDp": "320",
  "X-DFE-Filter-Level": "3",
  "Host": "android.clients.google.com"
};

const FORM_CONTENT = "application/x-www-form-urlencoded; charset=UTF-8";

export default ({
  androidId=rc.androidId, authToken=rc.authToken,
  endpoint, headers, query, body, url,
}) => {
  assert(typeof authToken !== 'undefined', 'authToken required');
  assert(typeof endpoint !== 'undefined', 'endpoint required');

  let _headers = xtend(DEFAULT_HEADERS, {
    "Authorization": fmt("GoogleLogin auth=%s", authToken),
    "X-DFE-Device-Id": androidId
  }, headers);

  const _baseurl = url || rc.fdfe.url;
  const _url = fmt(_baseurl, endpoint);

  const req = {
    method: 'GET',
    uri: _url,
    qs: query,
    headers: _headers,
    json: false,
    gzip: false,
    encoding: null // body should be raw Buffer
  }

  if (body) {
    req.headers['Content-Type'] = FORM_CONTENT;
    req.body = body;
    req.method = 'POST';
  }

  debug(req);
  return request(req).spread((res, body) => {
    if (res.statusCode !== 200) {
      throw new RequestError(body.toString());
    }
    assert(res.headers['content-type'] === 'application/x-gzip', 'not application/x-gzip response');
    assert(Buffer.isBuffer(body), "expect Buffer body");
    debug(body);
    return body;
  });
}
