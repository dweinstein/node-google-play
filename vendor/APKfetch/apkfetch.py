from __future__ import print_function

import os
import sys
import json
import gzip
import time
import argparse
import requests

import apkfetch_pb2

from util import encrypt

GOOGLE_LOGIN_URL = 'https://android.clients.google.com/auth'
GOOGLE_CHECKIN_URL = 'https://android.clients.google.com/checkin'
GOOGLE_DETAILS_URL = 'https://android.clients.google.com/fdfe/details'
GOOGLE_DELIVERY_URL = 'https://android.clients.google.com/fdfe/delivery'

LOGIN_USER_AGENT = 'GoogleLoginService/1.3 (gio KOT49H)'
MARKET_USER_AGENT = 'Android-Finsky/5.7.10 (api=3,versionCode=80371000,sdk=24,device=falcon_umts,hardware=qcom,product=falcon_reteu,platformVersionRelease=4.4.4,model=XT1032,buildId=KXB21.14-L1.40,isWideScreen=0)'
CHECKIN_USER_AGENT = 'Android-Checkin/2.0 (gio KOT49H)'
DOWNLOAD_USER_AGENT = 'AndroidDownloadManager/4.4.4 (Linux; U; Android 4.4.4; XT1032 Build/KXB21.14-L1.40)'


def num_to_hex(num):
    hex_str = format(num, 'x')
    length = len(hex_str)
    return hex_str.zfill(length + length % 2)


class APKfetch(object):

    def __init__(self):
        self.session = requests.Session()
        self.user = self.passwd = self.androidid = self.token = self.auth = None
        
    def request_service(self, service, app, user_agent=LOGIN_USER_AGENT):
        self.session.headers.update({'User-Agent': user_agent,
                                     'Content-Type': 'application/x-www-form-urlencoded'})
        
        if self.androidid:
            self.session.headers.update({'device': self.androidid})

        data = {'accountType': 'HOSTED_OR_GOOGLE',
                'has_permission': '1',
                'add_account': '1',
                'get_accountid': '1',
                'service': service,
                'app': app,
                'source': 'android',
                'Email': self.user}
        
        if self.androidid:
            data['androidId'] = self.androidid
            
        data['EncryptedPasswd'] = self.token or encrypt(self.user, self.passwd)

        response = self.session.post(GOOGLE_LOGIN_URL, data=data, allow_redirects=True)
        response_values = dict([line.split('=', 1) for line in response.text.splitlines()])

        if 'Error' in response_values:
            error_msg = response_values.get('ErrorDetail', None) or response_values.get('Error')
            if 'Url' in response_values:
                error_msg += '\n\nTo resolve the issue, visit: ' + response_values['Url']
                error_msg += '\n\nOr try: https://accounts.google.com/b/0/DisplayUnlockCaptcha'
            raise RuntimeError(error_msg)
        elif 'Auth' not in response_values:
            raise RuntimeError('Could not login')

        return response_values.get('Token', None), response_values.get('Auth')
        
    def checkin(self):
        headers = {'User-Agent': CHECKIN_USER_AGENT,
                   'Content-Type': 'application/x-protobuf'}

        cr = apkfetch_pb2.AndroidCheckinRequest()
        cr.id = 0
        cr.checkin.build.timestamp = int(time.time())
        cr.checkin.build.sdkVersion = 16
        cr.marketCheckin = self.user
        cr.accountCookie.append(self.auth[5:])
        cr.deviceConfiguration.touchScreen = 3
        cr.deviceConfiguration.keyboard = 1
        cr.deviceConfiguration.navigation = 1
        cr.deviceConfiguration.screenLayout = 2
        cr.deviceConfiguration.hasHardKeyboard = False
        cr.deviceConfiguration.hasFiveWayNavigation = False
        cr.deviceConfiguration.screenDensity = 320
        cr.deviceConfiguration.glEsVersion = 131072
        cr.deviceConfiguration.systemSharedLibrary.extend(["android.test.runner", "com.android.future.usb.accessory",
                                                           "com.android.location.provider", "com.android.nfc_extras", 
                                                           "com.google.android.maps", "com.google.android.media.effects",
                                                           "com.google.widevine.software.drm", "javax.obex"])
        cr.deviceConfiguration.systemAvailableFeature.extend(["android.hardware.bluetooth", "android.hardware.camera",
                                                              "android.hardware.camera.autofocus", "android.hardware.camera.flash",
                                                              "android.hardware.camera.front", "android.hardware.faketouch", 
                                                              "android.hardware.location", "android.hardware.location.gps",
                                                              "android.hardware.location.network", "android.hardware.microphone", 
                                                              "android.hardware.nfc", "android.hardware.screen.landscape",
                                                              "android.hardware.screen.portrait", "android.hardware.sensor.accelerometer",
                                                              "android.hardware.sensor.barometer", "android.hardware.sensor.compass",
                                                              "android.hardware.sensor.gyroscope", "android.hardware.sensor.light",
                                                              "android.hardware.sensor.proximity", "android.hardware.telephony",
                                                              "android.hardware.telephony.gsm", "android.hardware.touchscreen",
                                                              "android.hardware.touchscreen.multitouch", 
                                                              "android.hardware.touchscreen.multitouch.distinct",
                                                              "android.hardware.touchscreen.multitouch.jazzhand", 
                                                              "android.hardware.usb.accessory", "android.hardware.usb.host", 
                                                              "android.hardware.wifi", "android.hardware.wifi.direct",
                                                              "android.software.live_wallpaper", "android.software.sip",
                                                              "android.software.sip.voip",
                                                              "com.google.android.feature.GOOGLE_BUILD", "com.nxp.mifare"])
        cr.deviceConfiguration.nativePlatform.extend(["armeabi-v7a", "armeabi"])
        cr.deviceConfiguration.screenWidth = 720
        cr.deviceConfiguration.screenHeight = 1280
        cr.version = 3
        cr.fragment = 0

        response = self.session.post(GOOGLE_CHECKIN_URL, data=cr.SerializeToString(), headers=headers, allow_redirects=True)

        checkin_response = apkfetch_pb2.AndroidCheckinResponse()
        checkin_response.ParseFromString(response.content)
        token = num_to_hex(checkin_response.securityToken)
        androidid = num_to_hex(checkin_response.androidId)
        return token, androidid

    def login(self, user, passwd, androidid=None):
        self.user = user
        self.passwd = passwd
        self.androidid = androidid

        self.token, self.auth = self.request_service('ac2dm', 'com.google.android.gsf')

        if not androidid:
            _, self.androidid = self.checkin()
            
        _, self.auth = self.request_service('androidmarket', 'com.android.vending', MARKET_USER_AGENT)
            
        return self.auth

    def version(self, package_name):
        headers = {'X-DFE-Device-Id': self.androidid,
                   'X-DFE-Client-Id': 'am-android-google',
                   'Accept-Encoding': '',
                   'Host': 'android.clients.google.com',
                   'Authorization': 'GoogleLogin Auth=' + self.auth,
                   'User-Agent': MARKET_USER_AGENT}

        params = {'doc': package_name}
        response = self.session.get(GOOGLE_DETAILS_URL, params=params, headers=headers, allow_redirects=True)
        
        details_response = apkfetch_pb2.ResponseWrapper()
        details_response.ParseFromString(response.content)
        version = details_response.payload.detailsResponse.docV2.details.appDetails.versionCode
        if not version:
            raise RuntimeError('Could not get version-code')
        return version

    def get_download_url(self, package_name, version_code):
        headers = {'X-DFE-Device-Id': self.androidid,
                   'X-DFE-Client-Id': 'am-android-google',
                   'Accept-Encoding': '',
                   'Host': 'android.clients.google.com',
                   'Authorization': 'GoogleLogin Auth=' + self.auth}

        data = {'doc': package_name,
                'ot': '1',
                'vc': version_code}

        response = self.session.get(GOOGLE_DELIVERY_URL, params=data, headers=headers, allow_redirects=True)
        delivery_response = apkfetch_pb2.ResponseWrapper()
        delivery_response.ParseFromString(response.content)
        url = delivery_response.payload.deliveryResponse.appDeliveryData.downloadUrl
        return url

    def list(self, package_name):
        vc_new = self.version(package_name)
        for vc in xrange(vc_new, -1, -1):
            url = self.get_download_url(package_name, vc)
            if url:
                yield vc

    def fetch(self, package_name, version_code, apk_fn=None):
        url = self.get_download_url(package_name, version_code)
        if not url:
            raise RuntimeError('Could not get download URL')

        response = self.session.get(url, headers={'User-Agent': DOWNLOAD_USER_AGENT}, 
                                    stream=True, allow_redirects=True)

        apk_fn = apk_fn or (package_name + '.apk')
        if os.path.exists(apk_fn):
            os.remove(apk_fn)

        with open(apk_fn, 'wb') as fp:
            for chunk in response.iter_content(chunk_size=5*1024): 
                if chunk:
                    fp.write(chunk)
                    fp.flush()

        return os.path.exists(apk_fn)


def main(argv):
    parser = argparse.ArgumentParser(add_help=False, description=('Fetch APK files from the Google Play store'))
    parser.add_argument('--help', '-h', action='help', default=argparse.SUPPRESS, help='Show this help message and exit')
    parser.add_argument('--user', '-u', help='Google username')
    parser.add_argument('--passwd', '-p', help='Google password')
    parser.add_argument('--androidid', '-a', help='AndroidID')
    parser.add_argument('--package', '-k', help='Package name of the app')
    parser.add_argument('--version', '-v', help='Download a specific version of the app')
    parser.add_argument('--search', '-s', help='Find all versions of the app that are available', action='store_true')
    parser.add_argument('--login', '-l', help='Get login token', action='store_true')

    try:
        args = parser.parse_args(sys.argv[1:])

        user = args.user
        passwd = args.passwd
        androidid = args.androidid
        package = args.package
        version = args.version

        if not user or not passwd:
            parser.print_usage()
            raise ValueError('user, passwd, and package are required options')

        apk = APKfetch()
        token = apk.login(user, passwd, androidid)

        if args.login:
            print("{}".format(token))
            sys.exit(0)

        if not androidid and apk.androidid:
            print('AndroidID', apk.androidid)

        if args.search:
            print('The following versions are available:', end = '')
            for vc in apk.list(package):
                print(' %d' % vc, end = '')
                # We don't want to get blocked..
                time.sleep(1)
            print('')
        else:
            version = version or apk.version(package)
            if apk.fetch(package, version):
                print('Downloaded version', version)

    except Exception as e:
        print('Error:', str(e))
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:])
