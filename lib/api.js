'use strict';
const Promise = require('bluebird');
const ProtoBuf = require('protobufjs');
const request = Promise.promisifyAll(require('request'), { multiArgs: true });
const util = require('util');
const fmt = util.format;
const _ = require('lodash');
const assert = require('assert');
const qs = require('querystring');
const stringify = require('json-stable-stringify');
const debug = require('debug')('gp:api');

// protobuf initialization
const builder = ProtoBuf.loadProtoFile(require.resolve('google-play-proto/googleplay.proto'));
const ResponseWrapper = builder.build('ResponseWrapper');
const BulkDetailsRequest = builder.build('BulkDetailsRequest');

// utilities/errors
const responseToObj = require('./response-to-obj');
const RequestError = require('./errors').RequestError;
const LoginError = require('./errors').LoginError;
const AppNotFreeError = require('./errors').AppNotFreeError;
const encryptLogin = require('./login').encryptLogin;

const USER_AGENT = 'Android-Finsky/5.12.7 (api=3,versionCode=80420700,sdk=23,device=flo,hardware=flo,product=razor,platformVersionRelease=6.0.1,model=Nexus%207,buildId=MOB30X,isWideScreen=0)';
const DOWNLOAD_MANAGER_USER_AGENT = 'AndroidDownloadManager/6.0.1 (Linux; U; Android 6.0.1; Nexus 7 Build/MOB30X)';

const DEFAULTS = {
  username: undefined,
  password: undefined,
  authToken: undefined,
  language: 'en_US',
  useCache: false,
  debug: false,
  sdkVersion: '23',
  countryCode: 'us',
  apiUserAgent: USER_AGENT,
  downloadUserAgent: DOWNLOAD_MANAGER_USER_AGENT,
  preFetch: false,
  cacheInvalidationInterval: 30000, // 30 sec
  deviceCountry: 'us',
  clientId: 'am-android-google',
  androidVending: 'com.android.vending',
  accountType: 'HOSTED_OR_GOOGLE',
  service: 'androidmarket',
  loginUrl: 'https://android.clients.google.com/auth',
  unsupportedExperiments: [
    'nocache:billing.use_charging_poller',
    'market_emails', 'buyer_currency', 'prod_baseline',
    'checkin.set_asset_paid_app_field', 'shekel_test', 'content_ratings',
    'buyer_currency_in_app', 'nocache:encrypted_apk', 'recent_changes'
  ],
  enabledExperiments: [
    'cl:billing.select_add_instrument_by_default'
  ]
};

/**
 * GooglePlay API
 * @param {String|Object} opts - API options object
 * @param {String} opts.username - Google Login
 * @param {String} opts.password - Google Password
 * @param {String} opts.authToken - Use instead of username/password
 * @param {String} opts.androidId - Device ID
 * @param {Boolean} opts.useCache - enable debug output (default: false)
 * @param {Boolean} opts.debug - enable request debug output (default: false)
 * @param {Object} opts.requestsDefaultParams - default params you can set to
 *   requests (see https://github.com/request/request#requestoptions-callback)
 *   e.g., for setting a proxy.
 * @return {Class}
 */
const GooglePlay = function GooglePlay (opts) {
  const _opts = {};

  if (!_.isObject(opts)) {
    throw new Error('Options changed, see https://github.com/dweinstein/node-google-play/blob/master/README.md');
  } else {
    _.defaults(_opts, opts, DEFAULTS); // mutates _opts
  }

  // see if user extra debug logging requested
  _opts.debug = opts.debug || /gp:api/.test(process.env.DEBUG);

  let _request;
  if (_opts.requestsDefaultParams) {
    _request = Promise.promisifyAll(
      require('request').defaults(_opts.requestsDefaultParams),
      { multiArgs: true }
    );
  } else {
    _request = request;
  }

  if (_opts.debug) {
    require('request-debug')(_request);
  }

  /**
   * Login to Google API
   */
  const login = Promise.method(function (force) {
    if (typeof _opts.username === 'undefined' || typeof _opts.password === 'undefined') {
      if (typeof _opts.authToken === 'undefined') {
        throw new Error('You must provide a username and password or set the auth token.');
      }
    }

    if (_opts.authToken && !force) {
      return _opts.authToken;
    }

    const encryptedPassword = encryptLogin(_opts.username, _opts.password);

    const body = {
      'Email': _opts.username,
      'EncryptedPasswd': encryptedPassword,
      'service': _opts.service,
      'accountType': _opts.accountType,
      'has_permission': '1',
      'source': 'android',
      'androidId': _opts.androidId,
      'app': _opts.androidVending,
      'device_country': _opts.countryCode,
      'operatorCountry': _opts.countryCode,
      'lang': _opts.countryCode,
      'sdk_version': _opts.sdkVersion
    };

    return _request.postAsync({url: _opts.loginUrl, gzip: true, json: false, form: body})
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
        _opts.authToken = response.auth;
        return response.auth;
      });
  });

  /**
   * Assist with request memoization by resolving a combination of request
   * fields to a cached Promise when possible. Only tested for HTTP GET
   * requests.
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
        'Accept-Language': _opts.language,
        'Authorization': `GoogleLogin auth=${_opts.authToken}`,
        'X-DFE-Enabled-Experiments': _opts.enabledExperiments.join(','),
        'X-DFE-Unsupported-Experiments': _opts.unsupportedExperiments.join(','),
        'X-DFE-Device-Id': _opts.androidId,
        'X-DFE-Client-Id': _opts.clientId,
        'User-Agent': _opts.apiUserAgent,
        'X-DFE-SmallestScreenWidthDp': '320',
        'X-DFE-Filter-Level': '3',
        'Host': 'android.clients.google.com'
      };

      if (!_opts.preFetch) {
        headers['X-DFE-No-Prefetch'] = true;
      }

      const url = fmt('https://android.clients.google.com/fdfe/%s', path);

      function handleRequest () {
        function postRequest () {
          headers['Content-Type'] = contentType;
          return _request.postAsync({
            url: url,
            qs: query,
            headers: headers,
            body: datapost,
            json: false,
            gzip: false,
            encoding: null // body should be raw Buffer
          });
        }
        function getRequest () {
          return _request.getAsync({
            url: url,
            qs: query,
            headers: headers,
            json: false,
            gzip: false,
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
        // assert(res.headers['content-type'] === 'application/protobuf', 'not application/protobuf response');
        assert(Buffer.isBuffer(body), 'expect Buffer body');
        return body;
      });
    });
  }

  const memoizedExecuteRequestApi2 = (
  _opts.useCache ? _.memoize(_executeRequestApi2, cachedGetResolver)
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
      const match = /(.*)\?(.*)/.exec(entry.url);
      if (match) {
        const path = match[1];
        const query = qs.parse(match[2]);
        const cacheKey = cachedGetResolver(path, query, false);
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
        const message = _toResponseWrapper(body);
        assert(typeof message !== 'undefined', 'empty response');
        if (_opts.useCache) {
          _tryHandlePrefetch(message, _opts.cacheInvalidationInterval);
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
    const data = new BulkDetailsRequest({
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
    const query = {q: term, c: 3, n: nbResults || 20, o: offset || 0};
    return executeRequestApi('search', query).then(function (res) {
      assert(res.payload.searchResponse, 'expected response');
      assert(res.payload.searchResponse.doc, 'expected doc');
      return res.payload.searchResponse.doc;
    });
  }

  function getDeliveryData (pkg, vc, ot = 1) {
    const query = { doc: pkg, vc: vc, ot: ot };

    return executeRequestApi('delivery', query).then((res) => {
      assert(res.payload.deliveryResponse, 'expected delivery response');
      const appDeliveryData = res.payload.deliveryResponse.appDeliveryData;
      assert(appDeliveryData, 'expected appDeliveryData');
      return appDeliveryData;
    });
  }

  function getReviews (pkg, nbResults, offset) {
    if (nbResults > 20) {
      nbResults = 20;
    }
    const query = {doc: pkg, c: 3, n: nbResults || 20, o: offset || 0};
    return executeRequestApi('rev', query).then(function (res) {
      assert(res.payload.reviewResponse, 'expected response');
      assert(res.payload.reviewResponse.getResponse, 'expected getResponse');
      return res.payload.reviewResponse.getResponse;
    });
  }

  /**
   * Browse categories
   * @param {String} cat - category id
   * @param {String} ctr - sub-category id
   */
  function browse (cat, ctr) {
    const query = { c: 3, cat: cat, ctr: ctr };
    return executeRequestApi('browse', query).then(function (res) {
      assert(res.payload.browseResponse, 'expected response');
      return res.payload.browseResponse;
    });
  }

  function getCategories () {
    return browse(undefined, undefined)
      .then((response) => {
        return response.category;
      });
  }

  /**
   * Get URL and cookie info for downloading a file from Google.
   * @param {String} pkg
   * @param {Number} versionCode
   */
  function getDownloadInfo (pkg, versionCode) {
    return getDeliveryData(pkg, versionCode)
      .catch((_) => {
        return purchase(pkg, versionCode)
          .then((purchaseInfo) => {
            if (purchaseInfo.downloadSize === null) {
              return getDeliveryData(pkg, versionCode);
            } else {
              return purchaseInfo;
            }
          });
      });
  }

  /**
   * Make purchaes request for package, and version
     * @param {String} pkg
     * @param {Number} versionCode
     */
  function purchase (pkg, versionCode) {
    const body = fmt('ot=1&doc=%s&vc=%d', pkg, versionCode);

    return executeRequestApi('purchase', {}, body).then(function (res) {
      assert(res.payload.buyResponse, 'expected buy response');
      if (!res.payload.buyResponse.purchaseStatusResponse) {
        const amount = res.payload.buyResponse.checkoutinfo.item.amount.formattedAmount;
        return Promise.reject(new AppNotFreeError('App is not free', amount));
      }
      assert(res.payload.buyResponse.purchaseStatusResponse, 'expected purchaseStatusResponse');
      const purchaseStatusResponse = res.payload.buyResponse.purchaseStatusResponse;
      const appDeliveryData = purchaseStatusResponse.appDeliveryData;
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
      const asStr = fmt('%s=%s', cookie.name, cookie.value);
      jar.setCookie(_request.cookie(asStr), url);
      return jar;
    }, _request.jar()).value();
  }

  /**
   * returns complete and request-ready options object
   * @param pkg
   * @param versionCode
   */
  function getCompleteDownloadInfo (pkg, versionCode) {
    const headers = {
      'User-Agent': _opts.downloadUserAgent,
      'Accept-Encoding': ''
    };

    return getDownloadInfo(pkg, versionCode)
      .then(function (res) {
        assert(res.downloadUrl, 'require downloadUrl');
        assert(res.downloadAuthCookie, 'require downloadAuthCookie');
        const url = res.downloadUrl;
        const cookieJar = _prepCookies(url, res.downloadAuthCookie);
        return { url: url, jar: cookieJar, headers: headers, appDeliveryData: res };
      });
  }

  /**
   * Returns complete and request-ready options object for additional file.
   * @param pkg
   * @param versionCode
   * @param fileIndex
   */
  function getAdditionalFileCompleteDownloadInfo (pkg, versionCode, fileIndex) {
    const headers = {
      'User-Agent': _opts.downloadUserAgent,
      'Accept-Encoding': ''
    };
    assert(typeof fileIndex !== 'undefined', 'file index required');

    return getDownloadInfo(pkg, versionCode)
      .then(function (res) {
        if (fileIndex > res.additionalFile.length) {
          throw new Error('no such additional file at index');
        }
        assert(res.additionalFile[fileIndex], 'require downloadUrl');
        assert(res.downloadAuthCookie, 'require downloadAuthCookie');
        const url = res.additionalFile[fileIndex].downloadUrl;
        const cookieJar = _prepCookies(url, res.downloadAuthCookie);
        return { url: url, jar: cookieJar, headers: headers };
      });
  }

  /**
   * Download a specific package, at a specific versionCode.
   * @return {Promise} promise of request object, e.g., can use .pipe(..)
   */
  function downloadApk (pkg, versionCode) {
    return getCompleteDownloadInfo(pkg, versionCode)
      .then(function (options) {
        return _request.get(options);
      });
  }

  /**
   * Download additional file for a specific package, at a specific versionCode.
   * @return {Promise} promise of request object, e.g., can use .pipe(..)
   */
  function downloadAdditionalFile (pkg, versionCode, index) {
    return getAdditionalFileCompleteDownloadInfo(pkg, versionCode, index)
      .then(function (options) {
        return _request.get(options);
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
    login: function (force, cb) {
      return login(force).nodeify(cb);
    },
    executeRequestApi: executeRequestApi,
    details: function details (pkg, cb) {
      return getPackageDetails(pkg).nodeify(cb);
    },
    bulkDetails: function bulkDetails (pkgs, cb) {
      return getBulkDetails(pkgs).nodeify(cb);
    },
    browse: function (cat, ctr, cb) {
      return browse(cat, ctr).nodeify(cb);
    },
    categories: function categories (cb) {
      return getCategories().nodeify(cb);
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
    additionalFileCompleteDownloadInfo: function additionalFileCompleteDownloadInfo (pkg, vc, idx, cb) {
      return getAdditionalFileCompleteDownloadInfo(pkg, vc, idx).nodeify(cb);
    },
    download: function download (pkg, vc, cb) {
      return downloadApk(pkg, vc).nodeify(cb);
    },
    downloadAdditionalFile: function download (pkg, vc, idx, cb) {
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
  errors: require('./errors')
};
