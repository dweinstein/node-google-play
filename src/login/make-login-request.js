'use strict';

import assert from 'assert';

import {
  SERVICE, ACCOUNT_TYPE_HOSTED_OR_GOOGLE, ANDROID_VENDING,
  DEVICE_COUNTRY, OPERATOR_COUNTRY, LOGIN_LANGUAGE, SDK_VERSION,
} from '../constants';

//
// Build a login request.
//
export default function makeLoginRequest(username, password, androidId) {
  return {
    "Email": username,
    "Passwd": password,
    "service": SERVICE,
    "accountType": ACCOUNT_TYPE_HOSTED_OR_GOOGLE,
    "has_permission": "1",
    "source": "android",
    "androidId": androidId,
    "app": ANDROID_VENDING,
    "device_country": DEVICE_COUNTRY,
    "operatorCountry": OPERATOR_COUNTRY,
    "lang": LOGIN_LANGUAGE,
    "sdk_version": SDK_VERSION
  };

};

