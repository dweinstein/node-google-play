function LoginError(msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.name = 'LoginError';
}


LoginError.prototype = Object.create(Error.prototype);
LoginError.prototype.constructor = LoginError;

module.exports.LoginError = LoginError;

function RequestError(msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.name = 'RequestError';
}

RequestError.prototype = Object.create(Error.prototype);
RequestError.prototype.constructor = RequestError;
module.exports.RequestError = RequestError;

