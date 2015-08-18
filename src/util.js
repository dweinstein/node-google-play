export function unescape (str) {
  return (str + Array(5 - str.length % 4).join('=')).replace(/\-/g,'+').replace(/_/g, '/');
}

export function decodeDigest (str) {
  return new Buffer(unescape(str), 'base64').toString('hex');
}

export function signatureToSha1(sig) {
  return decodeDigest(sig);
}
