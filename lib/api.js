var Promise = require('bluebird');
var fs = require('fs');
var ProtoBuf = require('protobufjs');
var request = Promise.promisifyAll(require('request'), { multiArgs: true });
var util = require('util');
var fmt = util.format;
var _ = require('lodash');
var assert = require('assert');
var qs = require('querystring');
var stringify = require('json-stable-stringify');
var debug = require('debug')('gp:api');

// protobuf initialization
var builder = ProtoBuf.loadProtoFile(__dirname + '/data/googleplay.proto');
var ResponseWrapper = builder.build("ResponseWrapper");
var PreFetch = builder.build("PreFetch");
var BulkDetailsRequest = builder.build("BulkDetailsRequest");
var getOrElseThrow = require('./get-or-throw');
var responseToObj = require('./response-to-obj');
var RequestError = require('./errors').RequestError;
var LoginError  = require('./errors').LoginError;
var AppNotFreeError = require('./errors').AppNotFreeError;

/**
 * GooglePlay API
 * @todo todo Consider allowing passing in Device configuration information to configure user-agent etc.
 * @param {String / Object} username/ options - required
 * @param {String} password - required
 * @param {String} androidId - required
 * @param {Boolean} useCache - enable debug output (default: true)
 * @param {Boolean} debug - enable request debug output (default: false)
 * @param {Object} requestsDefaultParams - default params you can set to requests (see https://github.com/request/request#requestoptions-callback)
 * @return {type}
 */
var GooglePlay = (function GooglePlay(username, password, androidId, useCache, _debug, requestsDefaultParams) {
  var options;
  /**
   * in case that username is an object, it's in fact an options parameter so we treat it as such
   */
  if (_.isObject(username)) {
    options = username;
  } else {
    options = {
      username: username,
      password: password,
      androidId: androidId,
      countryCode: 'us',
      useCache: useCache,
      _debug: _debug,
      requestsDefaultParams: requestsDefaultParams
    };
  }

  // default for args:
  options.androidId = options.androidId || null;
  options._debug = /gp:api/.test(process.env.DEBUG) || options._debug === true;

  var USE_CACHE = (options.useCache === true);
  var authToken;

  if (options._debug) {
    require('request-debug')(request);
  }

  if (options.requestsDefaultParams) {
    request = Promise.promisifyAll(require('request').defaults(options.requestsDefaultParams), {multiArgs: true});
  }

  getOrElseThrow(options.username, 'Require username');
  getOrElseThrow(options.password, 'Require password');
  getOrElseThrow(options.androidId, 'Require Android ID');

  var DEVICE_COUNTRY, OPERATOR_COUNTRY, LOGIN_LANGUAGE;
  DEVICE_COUNTRY = LOGIN_LANGUAGE = OPERATOR_COUNTRY = options.countryCode;

  // Various constants used for requests:
  // TODO: consider using a single object to hold these values?
  var SERVICE = "androidmarket";
  var URL_LOGIN = "https://android.clients.google.com/auth";
  var ACCOUNT_TYPE_GOOGLE = "GOOGLE";
  var ACCOUNT_TYPE_HOSTED = "HOSTED";
  var ACCOUNT_TYPE_HOSTED_OR_GOOGLE = "HOSTED_OR_GOOGLE";
  var SDK_VERSION = "16";
  var UNSUPPORTED_EXPERIMENTS = [
    "nocache:billing.use_charging_poller",
    "market_emails", "buyer_currency", "prod_baseline",
    "checkin.set_asset_paid_app_field", "shekel_test", "content_ratings",
    "buyer_currency_in_app", "nocache:encrypted_apk", "recent_changes"
  ];
  var ENABLED_EXPERIMENTS = [
     "cl:billing.select_add_instrument_by_default"
  ];
  var CLIENT_ID = "am-android-google";
  // TODO: denormalize this a bit to allow greater configurability?
  var USER_AGENT = "Android-Finsky/4.3.11 " +
    "(api=3,versionCode=80230011,sdk=17,device=toro,hardware=tuna,product=mysid)";
  var ACCEPT_LANGUAGE = "en_US";
  var ANDROID_VENDING = "com.android.vending";
  var DOWNLOAD_MANAGER_USER_AGENT = "AndroidDownloadManager/4.2.2 (Linux; U; Android 4.2.2; Galaxy Nexus Build/JDQ39)";
  // END CONSTANTS

  var CACHE_INVALIDATION_INTERVAL = 30000;

  /**
   * Login to Google API
   */
  var login = Promise.method(function() {
    if (typeof options.username === 'undefined' || typeof options.password === 'undefined') {
      if (typeof authToken === 'undefined') {
        throw new Error("You must provide a username and password or set the auth token.");
      }
    }

    if (authToken) {
      return;
    }

    var body = {
      "Email": options.username,
      "Passwd": options.password,
      "service": SERVICE,
      "accountType": ACCOUNT_TYPE_HOSTED_OR_GOOGLE,
      "has_permission": "1",
      "source": "android",
      "androidId": options.androidId,
      "app": ANDROID_VENDING,
      "device_country": DEVICE_COUNTRY,
      "operatorCountry": OPERATOR_COUNTRY,
      "lang": LOGIN_LANGUAGE,
      "sdk_version": SDK_VERSION
    };

    return request.postAsync({url: URL_LOGIN, gzip: true, json: false, form: body})
    .spread(function (res, body) {
      if (res.statusCode !== 200) {
        throw new LoginError(body);
      }
      assert(res.statusCode === 200, 'login failed');
      assert(res.headers['content-type'] === 'text/plain; charset=utf-8', 'utf8 string body');
      var response = responseToObj(body);
      if (!response || !response.auth) {
        throw new Error('expected auth in server response');
      }

      // set the auth token member to the response token.
      authToken = response.auth;
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
  function cachedGetResolver(path, query, datapost) {
    // ensure all fields in query are strings
    // assert(typeof datapost === 'undefined' || datapost === false, "only support POST atm");
    query = _.reduce(query, function (aux, v, k) {
      aux[k] = v.toString();
      return aux;
    }, {});
    var cacheKey = fmt("%s|%s|post=%s", path, stringify(query), datapost);
    return cacheKey;
  }

  /**
   * Internal function to execute requests against the google play API (version 2).
   * Responds in the form of a Buffer.
   * @return {Promise} Promise of a Buffer object.
   */
  function _executeRequestApi2(path, query, datapost, contentType) {
    return login().then(function() {
      //assert(typeof authToken !== 'undefined', 'need auth token');
      assert(typeof path !== 'undefined', 'need path');
      contentType = contentType || "application/x-www-form-urlencoded; charset=UTF-8";

      var headers = {
        "Accept-Language": ACCEPT_LANGUAGE,
        "Authorization": fmt("GoogleLogin auth=%s", authToken),
        "X-DFE-Enabled-Experiments": ENABLED_EXPERIMENTS.join(","),
        "X-DFE-Unsupported-Experiments": UNSUPPORTED_EXPERIMENTS.join(","),
        "X-DFE-Device-Id": androidId,
        "X-DFE-Client-Id": CLIENT_ID,
        "User-Agent": USER_AGENT,
        "X-DFE-SmallestScreenWidthDp": "320",
        "X-DFE-Filter-Level": "3",
        "Host": "android.clients.google.com" // TODO: is this needed?
      };

      var url = fmt("https://android.clients.google.com/fdfe/%s", path);

      function handleRequest() {
        function postRequest() {
          headers['Content-Type'] = contentType;
          return request.postAsync({
            url: url, qs: query, headers: headers, body: datapost,
            json: false, gzip: false,
            encoding: null // body should be raw Buffer
          });
        }
        function getRequest() {
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
        var msg;
        var contentType = res.headers['content-type'];
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

 var memoizedExecuteRequestApi2 = USE_CACHE ?
   _.memoize(_executeRequestApi2, cachedGetResolver) : _executeRequestApi2;

  /**
   * Insert preFetch data into cache to save us from some future requests.
   * @param {ResponseWrapper} response - the server response from which try and
   * cache preFetch fields.
   */
  function _tryHandlePrefetch(response, ttl) {
    if (!response.preFetch) {
      return;
    }
    response.preFetch.forEach(function (entry) {
      var match = /(.*)\?(.*)/.exec(entry.url);
      if (match) {
        var path = match[1];
        var query = qs.parse(match[2]);
        var cacheKey = cachedGetResolver(path, query, false);
        assert(typeof memoizedExecuteRequestApi2.cache !== 'undefined', "undefined cache");
        assert(typeof entry.response !== 'undefined', "need defined response to cache");
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
  function _toResponseWrapper(data) {
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
  function executeRequestApi(path, query, datapost, contentType) {
    return memoizedExecuteRequestApi2(path, query, datapost, contentType)
    .then(function (body) {
      var message = _toResponseWrapper(body);
      assert(typeof message !== 'undefined', "empty response");
      if (USE_CACHE) {
        _tryHandlePrefetch(message, CACHE_INVALIDATION_INTERVAL);
      }
      return message;
    });
  }

  /**
   * Get a package's current details.
   */
  function getPackageDetails(pkg) {
    return executeRequestApi('details', {doc: pkg}).then(function (res) {
      return res.payload.detailsResponse.docV2;
    });
  }

  /**
   * Efficiently get current app details for more than one package at a time.
   * @param {Array[String]} packages - list of packages.
   */
  function getBulkDetails(packages) {
    var data = new BulkDetailsRequest({
      includeChildDocs: true,
      includeDetails: true,
      docid: packages
    }).encode().toBuffer();

    return executeRequestApi('bulkDetails', {}, data, "application/x-protobuf")
    .then(function (res) {
      return _.map(res.payload.bulkDetailsResponse.entry, 'doc');
    });
  }

  function getRelatedApps(pkg) {
    return executeRequestApi('rec', {doc: pkg, rt: "1", c: "3"}).then(function (res) {
      assert(res.payload.listResponse, "expected response");
      assert(res.payload.listResponse.doc, "expected doc");
      return res.payload.listResponse.doc;
    });
  }

  function searchQuery(term, nbResults, offset) {
    if (nbResults > 100) {
      nbResults = 100;
    }
    var query = {q: term, c: 3, n: nbResults || 20, o: offset || 0};
    return executeRequestApi('search', query).then(function (res) {
      assert(res.payload.searchResponse, "expected response");
      assert(res.payload.searchResponse.doc, "expected doc");
      return res.payload.searchResponse.doc;
    });
  }

  function getDeliveryData(pkg, vc) {
    return getDownloadInfo(pkg, vc);
  }

  function getReviews(pkg, nbResults, offset) {
    if (nbResults > 20) {
      nbResults = 20;
    }
    var query = {doc: pkg, c: 3, n: nbResults || 20, o: offset || 0};
    return executeRequestApi('rev', query).then(function (res) {
      assert(res.payload.reviewResponse, "expected response");
      assert(res.payload.reviewResponse.getResponse, "expected getResponse");
      return res.payload.reviewResponse.getResponse;
    });
  }


  /**
   * Get URL and cookie info for downloading a file from Google.
   * @param {String} pkg
   * @param {Integer} versionCode
   */
  function getDownloadInfo(pkg, versionCode) {
    var body = fmt("ot=1&doc=%s&vc=%d", pkg, versionCode);
    return executeRequestApi('purchase', {}, body).then(function (res) {
      assert(res.payload.buyResponse, "expected buy response");
      if (!res.payload.buyResponse.purchaseStatusResponse) {
        var amount = res.payload.buyResponse.checkoutinfo.item.amount.formattedAmount;
        return Promise.reject(new AppNotFreeError('App is not free', amount));
      }
      assert(res.payload.buyResponse.purchaseStatusResponse, "expected purchaseStatusResponse");
      var purchaseStatusResponse = res.payload.buyResponse.purchaseStatusResponse;
      var appDeliveryData = purchaseStatusResponse.appDeliveryData;
      assert(appDeliveryData, "expected appDeliveryData");
      return appDeliveryData;
    });
  }

  /**
   * Return a request cookie jar.
   * @param {String} url
   * @param {Array} cookies - array of {name: "...", value: "..."} objects.
   */
  function _prepCookies(url, cookies) {
    return _.chain(cookies).reduce(function(jar, cookie) {
      assert(typeof cookie === 'object', "expected cookie object");
      assert(typeof cookie.name === 'string', "expected cookie name string");
      assert(typeof cookie.value === 'string', "expected cookie value string");
      var asStr = fmt("%s=%s", cookie.name, cookie.value);
      jar.setCookie(request.cookie(asStr), url);
      return jar;
    }, request.jar()).value();
  }

  /**
   * returns complete and request-ready options object
   * @param pkg
   * @param versionCode
   */
  function getCompleteDownloadInfo(pkg, versionCode) {
    var headers = {
      "User-Agent": DOWNLOAD_MANAGER_USER_AGENT,
      "Accept-Encoding": ""
    };

    return getDownloadInfo(pkg, versionCode)
        .then(function (res) {
          assert(res.downloadUrl, 'require downloadUrl');
          assert(res.downloadAuthCookie, 'require downloadAuthCookie');
          var url = res.downloadUrl;
          var cookieJar = _prepCookies(url, res.downloadAuthCookie);
          return {url: url, jar: cookieJar, headers: headers};
        })
  }

  /**
   * Download a specific package, at a specific versionCode.
   * @return {Promise} promise of request object, e.g., can use .pipe(..)
   */
  function downloadApk(pkg, versionCode) {
    return getCompleteDownloadInfo(pkg, versionCode)
        .then(function (options) {
          return request.get(options);
        });
  }

  function cachedKeys() {
    return _.keys(memoizedExecuteRequestApi2.cache);
  }

  function invalidateCache() {
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
    details : function details(pkg, cb) {
      return getPackageDetails(pkg).nodeify(cb);
    },
    bulkDetails: function bulkDetails(pkgs, cb) {
      return getBulkDetails(pkgs).nodeify(cb);
    },
    related: function related(pkg, cb) {
      return getRelatedApps(pkg).nodeify(cb);
    },
    downloadInfo: function downloadInfo(pkg, vc, cb) {
      return getDownloadInfo(pkg, vc).nodeify(cb);
    },
    completeDownloadInfo: function completeDownloadInfo(pkg, vc, cb) {
      return getCompleteDownloadInfo(pkg, vc).nodeify(cb);
    },
    download: function download(pkg, vc, cb) {
      return downloadApk(pkg, vc).nodeify(cb);
    },
    deliveryData: function deliveryData(pkg, vc, cb) {
      return getDeliveryData(pkg, vc).nodeify(cb);
    },
    search: function search(term, nResults, offset, cb) {
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
    reviews: function reviews(pkg, nResults, offset, cb) {
      return getReviews(pkg, nResults, offset).nodeify(cb);
    },
    cachedKeys: cachedKeys,
    invalidateCache: invalidateCache
  };

});

module.exports = {
  GooglePlayAPI: GooglePlay,
  responseToObj: responseToObj
};
