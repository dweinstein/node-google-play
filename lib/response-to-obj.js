var _ = require('lodash');
var assert = require('assert');

/**
 * Parsed string into object.
 * @param {String} lines - e.g., "FOO=bar\nBAZ=foo"
 * @return {Object} parsed object result, e.g., {foo: "bar", baz: "foo"}
 */
module.exports = function responseToObj (lines) {
  return _.chain(lines.split('\n')).reduce(function (obj, line) {
    var pair = _.split(line, '=', 2);
    assert(pair.length === 2, 'expected list of pairs from server');
    var key = pair[0].toLowerCase();
    var val = pair[1];
    obj[key] = val;
    return obj;
  }, {}).value();
};
