'use strict';
const Promise = require('bluebird');
const ProtoBuf = require('protobufjs');
const defaultRequest = Promise.promisifyAll(require('request'), { multiArgs: true });
const util = require('util');
const fmt = util.format;
const _ = require('lodash');
const assert = require('assert');
const qs = require('querystring');
const stringify = require('json-stable-stringify');
const debug = require('debug')('gp:api');

// protobuf initialization
const join = require('path').join;
const builder = ProtoBuf.loadProtoFile(join(__dirname, '/data/googleplay.proto'));
const ResponseWrapper = builder.build('ResponseWrapper');
const BulkDetailsRequest = builder.build('BulkDetailsRequest');
const responseToObj = require('./response-to-obj');
const RequestError = require('./errors').RequestError;
const LoginError = require('./errors').LoginError;
const AppNotFreeError = require('./errors').AppNotFreeError;

const USER_AGENT = (
  'Android-Finsky/4.3.11 ' +
    '(api=3,versionCode=80230011,sdk=16,device=toro,hardware=tuna,product=mysid)'
);
const DOWNLOAD_MANAGER_USER_AGENT = (
  'AndroidDownloadManager/4.2.2 ' +
    '(Linux; U; Android 4.2.2; Galaxy Nexus Build/JDQ39)'
);

const DEFAULTS = {
  authToken: undefined,
  countryCode: 'us',
  language: 'en_US',
  useCache: false,
  _debug: false,
  sdkVersion: '16',
  apiUserAgent: USER_AGENT,
  downloadUserAgent: DOWNLOAD_MANAGER_USER_AGENT
};

/**
 * GooglePlay API
 * @todo todo Consider allowing passing in Device configuration information to
 * configure user-agent etc.
 * @param {String|Object} username_or_opts
 * @param {String} password - required
 * @param {String} androidId - required
 * @param {Boolean} useCache - enable debug output (default: true)
 * @param {Boolean} debug - enable request debug output (default: false)
 * @param {Object} requestsDefaultParams - default params you can set to
 * requests (see https://github.com/request/request#requestoptions-callback)
 * @return {type}
 */
const GooglePlay = function GooglePlay (username, password, androidId, useCache, _debug, requestsDefaultParams) {
  let opts, request;
  /**
   * In case that username is an object, it's in fact an options parameter so
   * we treat it as such
   */
  if (_.isObject(username)) {
    opts = _.defaults({}, username, DEFAULTS);
  } else {
    // TODO: warn that this codepath is being deprecated
    opts = _.defaults({}, {
      username: username,
      password: password,
      androidId: androidId,
      useCache: useCache,
      _debug: _debug,
      requestsDefaultParams: requestsDefaultParams
    }, DEFAULTS);
  }

  // default for args:
  opts._debug = /gp:api/.test(process.env.DEBUG) || opts._debug === true;

  let authToken = opts.authToken;

  if (opts._debug) {
    require('request-debug')(request);
  }

  //default paramenters should be applied to every google play instance individually
  if (opts.requestsDefaultParams) {
    request = Promise.promisifyAll(
      require('request').defaults(opts.requestsDefaultParams),
      { multiArgs: true }
    );
  } else {
    request = defaultRequest;
  }

  let DEVICE_COUNTRY, OPERATOR_COUNTRY, LOGIN_LANGUAGE;
  DEVICE_COUNTRY = LOGIN_LANGUAGE = OPERATOR_COUNTRY = opts.countryCode;

  // Various constants used for requests:
  // TODO: consider using a single object to hold these values?
  const SERVICE = 'androidmarket';
  const URL_LOGIN = 'https://android.clients.google.com/auth';
  // const ACCOUNT_TYPE_GOOGLE = 'GOOGLE';
  // const ACCOUNT_TYPE_HOSTED = 'HOSTED';
  const ACCOUNT_TYPE_HOSTED_OR_GOOGLE = 'HOSTED_OR_GOOGLE';
  const UNSUPPORTED_EXPERIMENTS = [
    'nocache:billing.use_charging_poller',
    'market_emails', 'buyer_currency', 'prod_baseline',
    'checkin.set_asset_paid_app_field', 'shekel_test', 'content_ratings',
    'buyer_currency_in_app', 'nocache:encrypted_apk', 'recent_changes'
  ];
  const ENABLED_EXPERIMENTS = [
    'cl:billing.select_add_instrument_by_default'
  ];
  const CLIENT_ID = 'am-android-google';
  // TODO: denormalize this a bit to allow greater configurability?
  const ACCEPT_LANGUAGE = opts.language;
  const ANDROID_VENDING = 'com.android.vending';
  // END CONSTANTS

  const CACHE_INVALIDATION_INTERVAL = 30000;

  /**
   * Login to Google API
   */
  const login = Promise.method(function (force) {
    if (typeof opts.username === 'undefined' || typeof opts.password === 'undefined') {
      if (typeof authToken === 'undefined') {
        throw new Error('You must provide a username and password or set the auth token.');
      }
    }

    if (authToken && !force) {
      return;
    }

    const body = {
      'Email': opts.username,
      'Passwd': opts.password,
      'service': SERVICE,
      'accountType': ACCOUNT_TYPE_HOSTED_OR_GOOGLE,
      'has_permission': '1',
      'source': 'android',
      'androidId': opts.androidId,
      'app': ANDROID_VENDING,
      'device_country': DEVICE_COUNTRY,
      'operatorCountry': OPERATOR_COUNTRY,
      'lang': LOGIN_LANGUAGE,
      'sdk_version': opts.sdkVersion
    };

    return request.postAsync({url: URL_LOGIN, gzip: true, json: false, form: body})
    .spread(function (res, body) {
      if (res.statusCode !== 200) {
        throw new LoginError(body);
      }
      assert(res.statusCode === 200, 'login failed');
      assert(res.headers['content-type'] === 'text/plain; charset=utf-8', 'utf8 string body');
      const response = responseToObj(body);
      if (!response || !response.auth) {
        throw new Error('expected auth in server response');
      }

      // set the auth token member to the response token.
      authToken = response.auth;
      return response.auth;
    });
  });

  /**
   * Assist with request memoization by resolving a combination of request
   * fields to a cached Promise when possible. Only tested for HTTP GET
   * requests.
   * @todo support post requests as well?
   * @param {String} path
   * @param {Object} query
   * @param {String} datapost - data for POST requests.
   */
  function cachedGetResolver (path, query, datapost) {
    // ensure all fields in query are strings
    // assert(typeof datapost === 'undefined' || datapost === false, "only support POST atm");
    query = _.reduce(query, function (aux, v, k) {
      aux[k] = v.toString();
      return aux;
    }, {});
    const cacheKey = fmt('%s|%s|post=%s', path, stringify(query), datapost);
    return cacheKey;
  }

  /**
   * Internal function to execute requests against the google play API (version 2).
   * Responds in the form of a Buffer.
   * @return {Promise} Promise of a Buffer object.
   */
  function _executeRequestApi2 (path, query, datapost, contentType) {
    return login().then(function () {
      assert(typeof path !== 'undefined', 'need path');
      contentType = contentType || 'application/x-www-form-urlencoded; charset=UTF-8';

      const headers = {
        'Accept-Language': ACCEPT_LANGUAGE,
        'Authorization': fmt('GoogleLogin auth=%s', authToken),
        'X-DFE-Enabled-Experiments': ENABLED_EXPERIMENTS.join(','),
        'X-DFE-Unsupported-Experiments': UNSUPPORTED_EXPERIMENTS.join(','),
        'X-DFE-Device-Id': opts.androidId,
        'X-DFE-Client-Id': CLIENT_ID,
        'User-Agent': opts.apiUserAgent,
        'X-DFE-SmallestScreenWidthDp': '320',
        'X-DFE-Filter-Level': '3',
        'Host': 'android.clients.google.com'
      };

      const url = fmt('https://android.clients.google.com/fdfe/%s', path);

      function handleRequest () {
        function postRequest () {
          headers['Content-Type'] = contentType;
          return request.postAsync({
            url: url, qs: query, headers: headers, body: datapost,
            json: false, gzip: false,
            encoding: null // body should be raw Buffer
          });
        }
        function getRequest () {
          return request.getAsync({
            url: url, qs: query, headers: headers,
            json: false, gzip: false,
            encoding: null // body should be raw Buffer
          });
        }
        if (datapost) {
          return postRequest();
        }
        return getRequest();
      }

      function handleErr (res, body) {
        let msg;
        const contentType = res.headers['content-type'];
        if (contentType === 'application/x-gzip' ||
           contentType === 'application/protobuf') {
          try {
            msg = ResponseWrapper.decode(body).commands.displayErrorMessage;
          } catch (e) {
            console.warn('please report this error: ', e.stack);
          }
        } else {
          msg = body.toString();
        }
        return Promise.reject(new RequestError(msg, res.statusCode, res.headers));
      }

      return handleRequest().spread(function (res, body) {
        if (res.statusCode !== 200) {
          return handleErr(res, body);
        }
        assert(res.statusCode === 200, 'http status code');
        assert(res.headers['content-type'] === 'application/protobuf', 'not application/protobuf response');
        assert(Buffer.isBuffer(body), 'expect Buffer body');
        return body;
      });
    });
  }

  var memoizedExecuteRequestApi2 = (
    opts.useCache ? _.memoize(_executeRequestApi2, cachedGetResolver)
      : _executeRequestApi2
  );

  /**
   * Insert preFetch data into cache to save us from some future requests.
   * @param {ResponseWrapper} response - the server response from which try and
   * cache preFetch fields.
   */
  function _tryHandlePrefetch (response, ttl) {
    if (!response.preFetch) {
      return;
    }
    response.preFetch.forEach(function (entry) {
      var match = /(.*)\?(.*)/.exec(entry.url);
      if (match) {
        var path = match[1];
        var query = qs.parse(match[2]);
        var cacheKey = cachedGetResolver(path, query, false);
        assert(typeof memoizedExecuteRequestApi2.cache !== 'undefined', 'undefined cache');
        assert(typeof entry.response !== 'undefined', 'need defined response to cache');
        if (memoizedExecuteRequestApi2[cacheKey]) {
          return;
        }

        memoizedExecuteRequestApi2.cache[cacheKey] = Promise.resolve(entry.response);
        if (ttl) {
          setTimeout(function () {
            debug('invalidating cache key: %s', cacheKey);
            delete memoizedExecuteRequestApi2.cache[cacheKey];
          }, ttl).unref();
        }
      }
    });
  }

  /**
   * Convert a data buffer to a ResponseWrapper object.
   * @param {Buffer} data
   */
  function _toResponseWrapper (data) {
    return ResponseWrapper.decode(data);
  }

  /**
   * Main API request handler. If server returns preFetch fields, cache them to
   * save on future requests.
   * @param {String} path
   * @param {Object} query
   * @param {String} datapost - data for POST requests.
   * @param {String} contentType - override content-type header.
   * @return {Promise} promise of a ResponseWrapper object.
   */
  function executeRequestApi (path, query, datapost, contentType) {
    return memoizedExecuteRequestApi2(path, query, datapost, contentType)
    .then(function (body) {
      var message = _toResponseWrapper(body);
      assert(typeof message !== 'undefined', 'empty response');
      if (opts.useCache) {
        _tryHandlePrefetch(message, CACHE_INVALIDATION_INTERVAL);
      }
      return message;
    });
  }

  /**
   * Get a package's current details.
   */
  function getPackageDetails (pkg) {
    return executeRequestApi('details', { doc: pkg })
    .then(function (res) {
      return res.payload.detailsResponse.docV2;
    });
  }

  /**
   * Efficiently get current app details for more than one package at a time.
   * @param {Array[String]} packages - list of packages.
   */
  function getBulkDetails (packages) {
    var data = new BulkDetailsRequest({
      includeChildDocs: true,
      includeDetails: true,
      docid: packages
    }).encode().toBuffer();

    return executeRequestApi('bulkDetails', {}, data, 'application/x-protobuf')
    .then(function (res) {
      return _.map(res.payload.bulkDetailsResponse.entry, 'doc');
    });
  }

  function getRelatedApps (pkg) {
    return executeRequestApi('rec', {doc: pkg, rt: '1', c: '3'}).then(function (res) {
      assert(res.payload.listResponse, 'expected response');
      assert(res.payload.listResponse.doc, 'expected doc');
      return res.payload.listResponse.doc;
    });
  }

  function searchQuery (term, nbResults, offset) {
    if (nbResults > 100) {
      nbResults = 100;
    }
    var query = {q: term, c: 3, n: nbResults || 20, o: offset || 0};
    return executeRequestApi('search', query).then(function (res) {
      assert(res.payload.searchResponse, 'expected response');
      assert(res.payload.searchResponse.doc, 'expected doc');
      return res.payload.searchResponse.doc;
    });
  }

  function getDeliveryData (pkg, vc) {
    return getDownloadInfo(pkg, vc);
  }

  function getReviews (pkg, nbResults, offset) {
    if (nbResults > 20) {
      nbResults = 20;
    }
    var query = {doc: pkg, c: 3, n: nbResults || 20, o: offset || 0};
    return executeRequestApi('rev', query).then(function (res) {
      assert(res.payload.reviewResponse, 'expected response');
      assert(res.payload.reviewResponse.getResponse, 'expected getResponse');
      return res.payload.reviewResponse.getResponse;
    });
  }

  /**
   * Get URL and cookie info for downloading a file from Google.
   * @param {String} pkg
   * @param {Integer} versionCode
   */
  function getDownloadInfo (pkg, versionCode) {
    var body = fmt('ot=1&doc=%s&vc=%d', pkg, versionCode);
    return executeRequestApi('purchase', {}, body).then(function (res) {
      assert(res.payload.buyResponse, 'expected buy response');
      if (!res.payload.buyResponse.purchaseStatusResponse) {
        var amount = res.payload.buyResponse.checkoutinfo.item.amount.formattedAmount;
        return Promise.reject(new AppNotFreeError('App is not free', amount));
      }
      assert(res.payload.buyResponse.purchaseStatusResponse, 'expected purchaseStatusResponse');
      var purchaseStatusResponse = res.payload.buyResponse.purchaseStatusResponse;
      var appDeliveryData = purchaseStatusResponse.appDeliveryData;
      assert(appDeliveryData, 'expected appDeliveryData');
      return appDeliveryData;
    });
  }

  /**
   * Return a request cookie jar.
   * @param {String} url
   * @param {Array} cookies - array of {name: "...", value: "..."} objects.
   */
  function _prepCookies (url, cookies) {
    return _.chain(cookies).reduce(function (jar, cookie) {
      assert(typeof cookie === 'object', 'expected cookie object');
      assert(typeof cookie.name === 'string', 'expected cookie name string');
      assert(typeof cookie.value === 'string', 'expected cookie value string');
      var asStr = fmt('%s=%s', cookie.name, cookie.value);
      jar.setCookie(request.cookie(asStr), url);
      return jar;
    }, request.jar()).value();
  }

  /**
   * returns complete and request-ready options object
   * @param pkg
   * @param versionCode
   */
  function getCompleteDownloadInfo (pkg, versionCode) {
    var headers = {
      'User-Agent': opts.downloadUserAgent,
      'Accept-Encoding': ''
    };

    return getDownloadInfo(pkg, versionCode)
        .then(function (res) {
          assert(res.downloadUrl, 'require downloadUrl');
          assert(res.downloadAuthCookie, 'require downloadAuthCookie');
          var url = res.downloadUrl;
          var cookieJar = _prepCookies(url, res.downloadAuthCookie);
          return {url: url, jar: cookieJar, headers: headers};
        });
  }

  /**
   * returns complete and request-ready options object for additional file
   * @param pkg
   * @param versionCode
   * @param fileIndex
   */
  function getAdditionalFileCompleteDownloadInfo (pkg, versionCode, fileIndex) {
    var headers = {
      'User-Agent': opts.downloadUserAgent,
      'Accept-Encoding': ''
    };

    return getDownloadInfo(pkg, versionCode)
        .then(function (res) {
          assert(res.additionalFile[fileIndex], 'require downloadUrl');
          assert(res.downloadAuthCookie, 'require downloadAuthCookie');
          var url = res.additionalFile[fileIndex].downloadUrl;
          var cookieJar = _prepCookies(url, res.downloadAuthCookie);
          return {url: url, jar: cookieJar, headers: headers};
        });
  }

  /**
   * Download a specific package, at a specific versionCode.
   * @return {Promise} promise of request object, e.g., can use .pipe(..)
   */
  function downloadApk (pkg, versionCode) {
    return getCompleteDownloadInfo(pkg, versionCode)
        .then(function (options) {
          return request.get(options);
        });
  }

  /**
   * Download additional file for a specific package, at a specific versionCode.
   * @return {Promise} promise of request object, e.g., can use .pipe(..)
   */
  function downloadAdditionalFile (pkg, versionCode, index) {
    return getAdditionalFileCompleteDownloadInfo(pkg, versionCode, index)
        .then(function (options) {
          return request.get(options);
        });
  }

  function cachedKeys () {
    return _.keys(memoizedExecuteRequestApi2.cache);
  }

  function invalidateCache () {
    if (!memoizedExecuteRequestApi2.cache) {
      return;
    }
    debug('invalidating cache');
    debug('old keys: %s', cachedKeys());
    memoizedExecuteRequestApi2.cache.each(function (v, k) {
      delete memoizedExecuteRequestApi2.cache[k];
    });

    debug('now keys: %s', cachedKeys());
  }

  return {
    login: login,
    executeRequestApi: executeRequestApi,
    details: function details (pkg, cb) {
      return getPackageDetails(pkg).nodeify(cb);
    },
    bulkDetails: function bulkDetails (pkgs, cb) {
      return getBulkDetails(pkgs).nodeify(cb);
    },
    related: function related (pkg, cb) {
      return getRelatedApps(pkg).nodeify(cb);
    },
    downloadInfo: function downloadInfo (pkg, vc, cb) {
      return getDownloadInfo(pkg, vc).nodeify(cb);
    },
    completeDownloadInfo: function completeDownloadInfo (pkg, vc, cb) {
      return getCompleteDownloadInfo(pkg, vc).nodeify(cb);
    },
    download: function download (pkg, vc, cb) {
      return downloadApk(pkg, vc).nodeify(cb);
    },
    downloadAdditionalFile: function download (pkg, vc, idx,cb) {
      return downloadAdditionalFile(pkg, vc, idx).nodeify(cb);
    },
    deliveryData: function deliveryData (pkg, vc, cb) {
      return getDeliveryData(pkg, vc).nodeify(cb);
    },
    search: function search (term, nResults, offset, cb) {
      if (typeof nResults === 'function') {
        cb = nResults;
        nResults = undefined;
      }
      if (typeof offset === 'function') {
        cb = offset;
        offset = undefined;
      }
      return searchQuery(term, nResults, offset).nodeify(cb);
    },
    reviews: function reviews (pkg, nResults, offset, cb) {
      return getReviews(pkg, nResults, offset).nodeify(cb);
    },
    cachedKeys: cachedKeys,
    invalidateCache: invalidateCache
  };
};

module.exports = {
  GooglePlayAPI: GooglePlay,
  responseToObj: responseToObj
};
