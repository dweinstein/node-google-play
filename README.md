[![NPM](https://nodei.co/npm/gpapi.png?downloads=true)](https://nodei.co/npm/gpapi/)

[![Build Status](https://travis-ci.org/dweinstein/node-google-play.png)](https://travis-ci.org/dweinstein/node-google-play)
[![npm version](https://badge.fury.io/js/gpapi.svg)](http://badge.fury.io/js/gpapi)

# SYNOPSIS

Call Google Play APIs from Node. You might want to check out the [CLI](https://github.com/dweinstein/node-google-play-cli) package as well.

# USAGE

```javascript
  var api = require('gpapi').GooglePlayAPI(user,pass, android_id);

  // promise
  api.details("com.viber.voip").then(console.log);

  // callback
  api.details("com.viber.voip", function (err, res) {
    console.log(err?err:res);
  }
```

# NOTES

- This client turns all byte fields to strings.

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