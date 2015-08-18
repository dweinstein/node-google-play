'use strict';
import { chain } from 'lodash';
import assert from 'assert';

/**
 * Parsed string into object.
 * @param {String} lines - e.g., "FOO=bar\nBAZ=foo"
 * @return {Object} parsed object result, e.g., {foo: "bar", baz: "foo"}
 */
export default function responseToObj(lines) {
  return chain(lines.split('\n')).reduce(function (obj, line) {
    const pair = line.split('=');
    assert(pair.length == 2, 'expected list of pairs from server');
    const key = pair[0].toLowerCase();
    const val = pair[1];
    obj[key] = val;
    return obj;
  }, {}).value();
};

