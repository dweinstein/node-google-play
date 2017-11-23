[![NPM](https://nodei.co/npm/gpapi.png?downloads=true)](https://nodei.co/npm/gpapi/)

[![Build Status](https://travis-ci.org/dweinstein/node-google-play.svg?branch=master)](https://travis-ci.org/dweinstein/node-google-play)
[![npm](https://img.shields.io/npm/dm/gpapi.svg)](https://www.npmjs.com/package/gpapi)

# SYNOPSIS

Call Google Play APIs from Node. You might want to check out the [CLI](https://github.com/dweinstein/node-google-play-cli) package as well.

By default behaves like a Nexus device with SDK 23 for app downloads.

# USAGE

```javascript
var api = require('gpapi').GooglePlayAPI({
  username: user,
  password: pass,
  androidId: android_id
  // apiUserAgent: optional API agent override (see below)
  // downloadUserAgent: optional download agent override (see below)
});

// usage via Promise
api.details("com.viber.voip").then(console.log);

// usage via node callback convention
api.details("com.viber.voip", function (err, res) {
  console.log(err ? err : res);
});
```

# Options

The options accepted:

```js
{
  username: username,
  password: password,
  androidId: androidId,
  countryCode: 'us',
  language: 'en_US',
  requestsDefaultParams: requestsDefaultParams,
  apiUserAgent: USER_AGENT,
  downloadUserAgent: DOWNLOAD_MANAGER_USER_AGENT
}
```

## Defaults

The default `apiUserAgent` and `downloadUserAgent` is from  Nexus 5X device, w/
Play Store version 6.8.44:

e.g.,:
```
const USER_AGENT = (
    'Android-Finsky/6.8.44.F-all%20%5B0%5D%203087104 ' +
    '(api=3,versionCode=80684400,sdk=23,device=bullhead,'+
    'hardware=bullhead,product=bullhead,platformVersionRelease=6.0.1,'+
    'model=Nexus%205X,buildId=MHC19Q,isWideScreen=0)'
);

const DOWNLOAD_MANAGER_USER_AGENT = (
  'AndroidDownloadManager/6.0.1 (Linux; U; Android 6.0.1; Nexus 5X Build/MHC19Q)'
);
```

Therefore you will have best luck getting an `ANDROID_ID` from a Nexus 5X or
override the value via the options object for your particular device.

## ID and User-Agent

Note that you'll need to grab the device-id (`ANDROID_ID`) and associated
user-agents for best performance of the library.

- `ANDROID_ID` - the ID for the device for Google. This is the GSF ID *not* the
  id from dialing `*#*#8255#*#*`. You can get the gsf id e.g., using the
  [device id
  app](https://play.google.com/store/apps/details?id=com.evozi.deviceid&hl=en)

- Another way is to setup an HTTP proxy and install a CA to the device to see
  the network traffic. Here is an example from a
  [mitmproxy](https://github.com/mitmproxy/mitmproxy) session:

![Device ID and API User-Agent](./docs/devid-ua-1.png?raw=true "Device ID and API UA")

![Download User-Agent](./docs/download-ua.png?raw=true "Download User Agent")

These values can then be passed to the API so that apps can be downloaded with
the restrictions of the particular device.

## requests defaults
Note that this library uses the [`requests` module](https://github.com/request/request), therefore you can [control proxy behavior](https://github.com/request/request#controlling-proxy-behaviour-using-environment-variables) or override defaults via the `requestDefaultsParams` option.

## Debugging

Use env variable `DEBUG` i.e., `DEBUG=gp:api` to enable debug output. This is done via [request-debug](https://github.com/request/request-debug).


# EXAMPLES

**Assumes you have set the following environment variables: `GOOGLE_LOGIN`, `GOOGLE_PASSWORD`, `ANDROID_ID`**

## App details

```javascript
± % node examples/details.js | jq '.'
{
  "docid": "com.viber.voip",
  "backendDocid": "com.viber.voip",
  "docType": 1,
  "backendId": 3,
  "title": "Viber",
  "creator": "Viber Media S.à r.l.",
  "descriptionHtml": "With Viber, everyone in the world can connect. Freely. More than 400 million Viber users text, call, and send photo and video messages worldwide over Wifi or 3G - for free. Viber Out can be used to make calls to non-Viber mobile and landline numbers at low rates. Viber is available for many smartphones and platforms.   <p>Viber is compatible with and optimized for Android tablets! Use Viber on your tablet and phone simultaneously.<br>On Viber, your phone number is your ID. The app syncs with your mobile contact list, automatically detecting which of your contacts have Viber. <p>•\tText with your friends<br>•\tMake free calls with HD sound quality<br>•\tPhoto sharing, video messages, voice messages, locations, stickers and emoticons<br>•\tGroups with up to 100 participants<br>•\tDownload stickers from the Sticker Market, making messaging fun! <br>•\tAbility to sort and reorder stickers<br>•\tPush notifications guarantee that you never miss a message or call, even when Viber is off<br>•\tIntegration with native contact list for calls and messages<br>•\tSupport for the Viber Desktop application on Windows and Mac <br>Localized to: Arabic, Catalan, Chinese (SP), Chinese (TR), Croatian, Czech, Danish, Dutch, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Malay, Norwegian, Polish, Portuguese (BR), Portuguese (PT), Romanian, Russian, Slovak, Spanish, Swedish, Tagalog, Thai, Turkish, Ukrainian and Vietnamese<br>Viber is completely free with no advertising. <br>We value your privacy. <p>Follow us for updates and news:<br>Facebook - <a href=\"https://www.google.com/url?q=http://facebook.com/viber&amp;sa=D&amp;usg=AFQjCNGlVhJn65339uldBAp6MeFXZIV3mA\" target=\"_blank\">http://facebook.com/viber</a><br>Twitter - <a href=\"https://www.google.com/url?q=http://twitter.com/viber&amp;sa=D&amp;usg=AFQjCNG60qtBs85Z7vg5eeagjANxTrdSjQ\" target=\"_blank\">http://twitter.com/viber</a><p>(*) Network data charges may apply",
  "offer": [
    {
      "micros": "0",
      "currencyCode": "USD",
      "formattedAmount": "Free",
      "checkoutFlowRequired": false,
      "offerType": 1
    }
  ],
 ...
```

## Related apps

```javascript
± % node examples/related.js | jq '.'
[
  {
    "backendId": 3,
    "title": "Similar apps",
    "child": [
      {
        "docid": "com.skype.raider",
        "backendDocid": "com.skype.raider",
        "docType": 1,
        "backendId": 3,
        "title": "Skype - free IM & video calls",
        "creator": "Skype",
        "offer": [
          {
            "micros": 0,
            "currencyCode": "USD",
            "formattedAmount": "Free",
            "checkoutFlowRequired": false,
            "offerType": 1
          }
        ],
        "availability": {
          "restriction": 1,
          "perdeviceavailabilityrestriction": [
            {
              "androidId": xxxxxxxxxxxxxxx9983,
              "deviceRestriction": 1,
              "channelId": 83938807
            }
          ],
          "availableIfOwned": true
        },
        ...
      }
  }
]
```

## Download info

```javascript
± % node examples/downloadInfo.js | jq '.'
{
  "url": "https://android.clients.google.com/market/download/Download?packageName=air.WatchESPN&versionCode=2100039&token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxw&downloadId=yyyyyyyyyyyyyyyyyyyy",
  "cookies": [
    {
      "name": "MarketDA",
      "value": "zzzzzzzzzzzzzzzzzzzz"
    }
  ]
}
```

## Complete Download info - complete object to be passed seamlessly to request.js

```javascript
± % node examples/completeDownloadInfo.js | jq '.'
{ url: 'https://android.clients.google.com/market/download/Download?packageName=com.viber.voip&versionCode=37&ssl=1&token=xxxxxxxxx&downloadId=-xxxxxxxxxxx',
  jar:
   RequestJar {
     _jar:
      CookieJar {
        enableLooseMode: true,
        store: { idx: { 'android.clients.google.com': { '/market/download': { MarketDA: Cookie="MarketDA=xxxxxxxx; Path=/market/download; hostOnly=true; aAge=29ms; cAge=29ms" } } } } } },
  headers: 
   { 'User-Agent': 'AndroidDownloadManager/4.2.2 (Linux; U; Android 4.2.2; Galaxy Nexus Build/JDQ39)',
     'Accept-Encoding': '' } }
```

# NOTES

