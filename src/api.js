'use strict';

import rc from './config';
import assert from 'assert';
import Debug from 'debug';
import getAuthToken from './login/get-auth-token';
import fdfeRequest from './make-fdfe-request';
import { ResponseWrapper, BulkDetailsRequest } from './protocol';
import { pluck } from 'lodash';
import removeEmptyValues from './protocol/remove-empty-values';

const debug = Debug('gpapi');

/**
 * GooglePlay API
 */
export default class GooglePlay {
  constructor(options) {
    this.androidId = options.androidId || rc.androidId;
    this.authToken = options.authToken || rc.authToken;
  }

  async auth({username, password, androidId}) {
    assert(username, 'require username');
    assert(password, 'require password');
    assert(androidId, 'require password');
    const url = rc.fdfe.login;
    this.authToken = await getAuthToken(url, username, password, androidId);
    return this.authToken;
  };

  /**
   * Get a package's current details.
   * @param {String} pkg - Android package name
   */
  async details (pkg) {
    assert(typeof pkg === 'string', 'pkg required');
    assert(this.authToken, 'require auth token');
    const opts = {
      endpoint: 'details',
      query:    { doc: pkg },
      headers:  { 'X-DFE-No-Prefetch': true },
      authToken: this.authToken
    };
    const response = await fdfeRequest(opts);
    const decoded = ResponseWrapper.decode(response);
    return removeEmptyValues(decoded.payload.detailsResponse.docV2);
  }

  /**
   * Efficiently get current app details for more than one package in a single request.
   * @param {Array[String]} pkgs - list of packages; keep this under 150 pkgs in my experience.
   */
  async bulkDetails(pkgs) {
    assert(pkgs.length <= 150, 'keep pkgs cardinality under <= 150');
    assert(Array.isArray(pkgs), 'pkgs required');
    assert(this.authToken, 'require auth token');
    const body = new BulkDetailsRequest({
      includeChildDocs: true,
      includeDetails: true,
      docid: pkgs
    }).encode().toBuffer();

    const opts = {
      endpoint: 'bulkDetails',
      body: body,
      headers:  {
        'X-DFE-No-Prefetch': true,
        'Content-Type': 'application/x-protobuf'
      },
      authToken: this.authToken,
    };

    const response = await fdfeRequest(opts);
    const decoded = ResponseWrapper.decode(response);
    return removeEmptyValues(pluck(decoded.payload.bulkDetailsResponse.entry, 'doc'));
  }

  /**
   * Get "related" packages.
   * @param {String} pkg - Android package name
   */
  async related(pkg) {
    assert(typeof pkg === 'string', 'pkg required');
    assert(this.authToken, 'require auth token');
    const opts = {
      endpoint: 'rec',
      query: { doc: pkg, rt: 1, c: 3},
      headers:  {
        'X-DFE-No-Prefetch': true,
      },
      authToken: this.authToken,
    };

    const response = await fdfeRequest(opts);
    const decoded = ResponseWrapper.decode(response);
    assert(decoded.payload, 'expected payload');
    assert(decoded.payload.listResponse, 'expected listResponse');
    assert(decoded.payload.listResponse.doc, 'expected doc');
    assert.equal(decoded.payload.listResponse.doc.length, 1, 'expected one doc');
    const child = decoded.payload.listResponse.doc[0].child;
    return removeEmptyValues(child);
  }

  async search(term, nbResults=20, offset=0) {
    assert(this.authToken, 'require auth token');
    if (nbResults > 100) {
      nbResults = 100;
    }
    const opts = {
      endpoint: 'search',
      query: { q: term, c: 3, n: nbResults, o: offset},
      headers:  {
        'X-DFE-No-Prefetch': true,
      },
      authToken: this.authToken,
    };

    const response = await fdfeRequest(opts);
    const decoded = ResponseWrapper.decode(response);
    assert(decoded.payload, 'expected payload');
    assert(decoded.payload.searchResponse, 'expected searchResponse');
    assert(decoded.payload.searchResponse.doc, 'expected doc');
    assert.equal(decoded.payload.searchResponse.doc.length, 1, 'expected one doc');
    const child = decoded.payload.searchResponse.doc[0].child;
    return removeEmptyValues(child);
  }

  async delivery(pkg, vc, ot=1) {
    assert(typeof pkg === 'string', 'pkg string required');
    assert(vc, 'versionCode required');
    assert(this.authToken, 'require auth token');
    assert(ot > 0, 'ot');

    const opts = {
      endpoint: 'delivery',
      query: { doc: pkg, vc, ot: ot },
      headers:  {
        'X-DFE-No-Prefetch': true
      },
      authToken: this.authToken
    };

    const response = await fdfeRequest(opts);
    const decoded = ResponseWrapper.decode(response);
    assert(decoded.payload, 'expected payload');
    assert(decoded.payload.deliveryResponse, 'expected deliveryResponse');
    debugger;
    assert(decoded.payload.deliveryResponse.appDeliveryData, 'expected appDeliveryData');
    const deliveryData = decoded.payload.deliveryResponse.appDeliveryData;
    return removeEmptyValues(deliveryData);
  }

}

