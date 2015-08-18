'use strict';

export const DEVICE_COUNTRY = 'us';
export const OPERATOR_COUNTRY = 'us';
export const LOGIN_LANGUAGE = 'us';

// TODO: consider using a single object to hold these values?
export const SERVICE = "androidmarket";
export const URL_LOGIN = "https://android.clients.google.com/auth";
export const ACCOUNT_TYPE_GOOGLE = "GOOGLE";
export const ACCOUNT_TYPE_HOSTED = "HOSTED";
export const ACCOUNT_TYPE_HOSTED_OR_GOOGLE = "HOSTED_OR_GOOGLE";
export const SDK_VERSION = "16";
export const UNSUPPORTED_EXPERIMENTS = [
  "nocache:billing.use_charging_poller",
  "market_emails", "buyer_currency", "prod_baseline",
  "checkin.set_asset_paid_app_field", "shekel_test", "content_ratings",
  "buyer_currency_in_app", "nocache:encrypted_apk", "recent_changes"
];
export const ENABLED_EXPERIMENTS = [
  "cl:billing.select_add_instrument_by_default"
];
export const CLIENT_ID = "am-android-google";
// TODO: denormalize this a bit to allow greater configurability?
export const USER_AGENT = "Android-Finsky/4.3.11 " +
  "(api=3,versionCode=80230011,sdk=17,device=toro,hardware=tuna,product=mysid)";
export const ACCEPT_LANGUAGE = "en_US";
export const ANDROID_VENDING = "com.android.vending";
export const DOWNLOAD_MANAGER_USER_AGENT = "AndroidDownloadManager/4.2.2 (Linux; U; Android 4.2.2; Galaxy Nexus Build/JDQ39)";

