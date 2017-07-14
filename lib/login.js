const crypto = require('crypto');
const getPem = require('rsa-pem-from-mod-exp');

module.exports.encryptLogin = encryptLoginSync;
module.exports.decomposeKey = decompose;

const GOOGLE_DEFAULT_PUBLIC_KEY = 'AAAAgMom/1a/v0lblO2Ubrt60J2gcuXSljGFQXgcyZWveWLEwo6prwgi3iJIZdodyhKZQrNWp5nKJ3srRXcUW+F1BD3baEVGcmEgqaLZUNBjm057pKRI16kB0YppeGx5qIQ5QjKzsR8ETQbKLNWgRY0QRNVz34kMJR3P/LgHax/6rmf5AAAAAwEAAQ==';

module.exports.GOOGLE_PUB_KEY = GOOGLE_DEFAULT_PUBLIC_KEY;

/*
 * Encrypt the username/password for use in `EncryptedPasswd`.
 * refs:
 * - https://github.com/yeriomin/play-store-api/blob/master/src/main/java/com/github/yeriomin/playstoreapi/PasswordEncrypter.java
 * - https://github.com/subtletech/google_play_store_password_encrypter/blob/master/google_play_store_password_encrypter.rb
 *
 *  We first convert the public key to RSA PEM format which is used
 *  throughout node's standard library.
 *
 *  The result is something like the below
 *  -----------------------------------------------------------------------------
 *  |00|4 bytes of sha1(publicKey)|rsaEncrypt(publicKeyPem, "login\x00password")|
 *  -----------------------------------------------------------------------------
 *  The result is then base64 URL-safe encoded and can be used as the
 *  `EncryptedPasswd`
 *  @param {String} login - Google username.
 *  @param {String} password - Google password.
 *  @return {String} `EncryptedPasswd` value.
 */
function encryptLoginSync (login, password) {
  const data = Buffer.from(login + '\u0000' + password);
  const publicKey = Buffer.from(GOOGLE_DEFAULT_PUBLIC_KEY, 'base64');
  const hash = crypto.createHash('sha1');
  const rsaPem = decompose(publicKey);

  const sha1 = hash.update(publicKey);
  const digest = sha1.digest();
  const signature = Buffer.concat([
    Buffer.from('\x00'),
    digest.slice(0, 4)
  ]);

  const encrypted = crypto.publicEncrypt(rsaPem, data);

  const res = Buffer.concat([
    signature,
    encrypted
  ]);

  return base64EncodeUrlSafe(res);
}

function base64EncodeUrlSafe (data) {
  return data.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

function decompose (_buf) {
  const buf = new Uint8Array(_buf);
  const i = _buf.readInt32BE();
  const mod = Buffer.from(buf.buffer, 4, i);
  const j = _buf.readInt32BE(i + 4);
  const exp = Buffer.from(buf.buffer, i + 8, j);
  return getPem(mod.toString('base64'), exp.toString('base64'));
}
