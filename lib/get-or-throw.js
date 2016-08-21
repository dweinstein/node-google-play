module.exports = function getOrElseThrow (thing, msg) {
  if (typeof thing === 'undefined') {
    throw new Error(msg);
  }
};
