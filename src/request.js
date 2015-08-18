'use strict';
import Promise from 'bluebird';
import request from 'request';
//import RequestDebug from 'request-debug';
//!!process.env.DEBUG && RequestDebug(Request);

export default Promise.promisify(request);
