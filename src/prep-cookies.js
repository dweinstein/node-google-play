import { chain } from 'lodash';
import request from './request';

/**
 * Return a request cookie jar.
 * @param {String} url
 * @param {Array} cookies - array of {name: "...", value: "..."} objects.
 */
export default function prepCookies(url, cookies) {
  return chain(cookies).reduce(function(jar, cookie) {
    assert(typeof cookie === 'object', "expected cookie object");
    assert(typeof cookie.name === 'string', "expected cookie name string");
    assert(typeof cookie.value === 'string', "expected cookie value string");
    const asStr = fmt("%s=%s", cookie.name, cookie.value);
    jar.setCookie(request.cookie(asStr), url);
    return jar;
  }, request.jar()).value();
}

