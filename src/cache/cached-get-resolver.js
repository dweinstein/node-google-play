import { reduce } from 'lodash';
import stringify from 'json-stable-stringify';

/**
 * Assist with request memoization by resolving a combination of request
 * fields to a cached Promise when possible. Only tested for HTTP GET
 * requests.
 * @todo support post requests as well?
 * @param {String} path
 * @param {Object} query
 * @param {String} datapost - data for POST requests.
 */
export default function cachedGetResolver(path, query, datapost) {
  // ensure all fields in query are strings
  // assert(typeof datapost === 'undefined' || datapost === false, "only support POST atm");
  query = reduce(query, function (aux, v, k) {
    aux[k] = v.toString();
    return aux;
  }, {});
  var cacheKey = fmt("%s|%s|post=%s", path, stringify(query), datapost);
  return cacheKey;
}
