/* jshint node: true, esnext: true */
'use strict';

import ProtoBuf from 'protobufjs';
import assert from 'assert';

function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

// --------------------------------- checkin --------------------------------- //
//
export default () => {

  // protobuf initialization
  const builder = ProtoBuf.loadProtoFile(__dirname + '/../../data/checkin.proto');

  const AndroidCheckinProto = builder.build("AndroidCheckinProto");
  const AndroidCheckinRequest = builder.build("AndroidCheckinRequest");
  const AndroidCheckinResponse = builder.build("AndroidCheckinResponse");
  const DeviceConfigurationProto = builder.build("DeviceConfigurationProto");
  const AndroidBuildProto = builder.build("AndroidBuildProto");
  const AndroidEventProto = builder.build("AndroidEventProto");

  assert(AndroidCheckinProto, 'no AndroidCheckinProto message');
  assert(AndroidCheckinRequest, 'no AndroidCheckinRequest message');
  assert(AndroidCheckinResponse, 'no AndroidCheckinResponse message');
  assert(DeviceConfigurationProto, 'no DeviceConfigurationProto message');
  assert(AndroidBuildProto, 'no AndroidBuildProto message');
  assert(AndroidEventProto, 'no AndroidEventProto message');

  function generateMeid() {
    // http://en.wikipedia.org/wiki/International_Mobile_Equipment_Identity
    // We start with a known base, and generate random MEID
    let meid = "35503104";
    for (let i = 0; i < 6; ++i) {
      meid += randomIntInc(0, 10);
    }
    // Luhn algorithm (check digit)
    let sum = 0;
    for (let i = 0; i < meid.length; ++i) {
      let c = parseInt(meid[i]);
      if ((meid.length - i - 1) % 2 == 0) {
        c *= 2;
        c = c % 10 + Math.round(c / 10);
      }
      sum += c;
    }
    let check = (100 - sum) % 10;
    meid += check.toString();
    return meid;
  }


  function generateMacAddr() {
    let mac = "b407f9";
    for (let i = 0; i < 6; i++) {
      mac += randomIntInc(0, 16).toString(16);
    }
    return mac;
  }

  function generateSerialNumber() {
    let serial = "3933E6";
    for (let i = 0; i < 10; i++) {
      serial += randomIntInc(0, 16).toString(16);
    }
    serial = serial.toUpperCase();
    return serial;
  }

  function generateCheckinPayload(args) {
    //assert(args.username, 'required args.username');
    //assert(args.username, 'required args.username');
    let meid    = generateMeid();
    let serial  = generateSerialNumber();
    let macAddr = generateMacAddr();
    let loggingId = randomIntInc(0, Math.pow(2,32));

    let checkin = new AndroidCheckinRequest();
    return checkin
        // imei
        .setId(0)
        .setDigest("1-929a0dca0eee55513280171a8585da7dcd3700f8")
        .setCheckin(new AndroidCheckinProto()
            .setBuild(new AndroidBuildProto()
                .setId("google/yakju/maguro:4.1.1/JRO03C/398337:user/release-keys")
                .setProduct("shamu")
                .setCarrier("Verizon")
                .setRadio("I9250XXLA2")
                .setBootloader("PRIMELA03")
                .setClient("android-google")
                .setTimestamp(new Date().getTime()/1000)
                .setGoogleServices(16)
                .setDevice("maguro")
                .setSdkVersion(16)
                .setModel("Galaxy Nexus")
                .setManufacturer("Samsung")
                .setBuildProduct("yakju")
                .setOtaInstalled(false))
            .setLastCheckinMsec(0)
            .set("event", new AndroidEventProto()
                .setTag("event_log_start")
                // value
                .setTimeMsec(+new Date()))
                // stat
                // requestedGroup
            .setCellOperator("310260") // T-Mobile
            .setSimOperator("310260")  // T-Mobile
            .setRoaming("mobile-notroaming")
            .setUserNumber(0))
        // desiredBuild
        .setLocale("en_US")
        .setLoggingId(loggingId)
        .add("macAddr", macAddr)
        .setMeid(meid)
        .add("accountCookie", "[" + "test@mail.com" + "]")
        .add("accountCookie", "authKeyFixMe")
        .setTimeZone("America/New_York")
        // securityToken
        .setVersion(3)
        .add("otaCert", "71Q6Rn2DDZl1zPDVaaeEHItd")
        .setSerialNumber(serial)
        // esn
        .setDeviceConfiguration(new DeviceConfigurationProto()
            .setTouchScreen(3)
            .setKeyboard(1)
            .setNavigation(1)
            .setScreenLayout(2)
            .setHasHardKeyboard(false)
            .setHasFiveWayNavigation(false)
            .setScreenDensity(320)
            .setGlEsVersion(131072)
            .set("systemSharedLibrary", [
                "android.test.runner",
                "com.android.future.usb.accessory",
                "com.android.location.provider",
                "com.android.nfc_extras",
                "com.google.android.maps",
                "com.google.android.media.effects",
                "com.google.widevine.software.drm",
                "javax.obex"])
            .set("systemAvailableFeature", [
                "android.hardware.bluetooth",
                "android.hardware.camera",
                "android.hardware.camera.autofocus",
                "android.hardware.camera.flash",
                "android.hardware.camera.front",
                "android.hardware.faketouch",
                "android.hardware.location",
                "android.hardware.location.gps",
                "android.hardware.location.network",
                "android.hardware.microphone",
                "android.hardware.nfc",
                "android.hardware.screen.landscape",
                "android.hardware.screen.portrait",
                "android.hardware.sensor.accelerometer",
                "android.hardware.sensor.barometer",
                "android.hardware.sensor.compass",
                "android.hardware.sensor.gyroscope",
                "android.hardware.sensor.light",
                "android.hardware.sensor.proximity",
                "android.hardware.telephony",
                "android.hardware.telephony.gsm",
                "android.hardware.touchscreen",
                "android.hardware.touchscreen.multitouch",
                "android.hardware.touchscreen.multitouch.distinct",
                "android.hardware.touchscreen.multitouch.jazzhand",
                "android.hardware.usb.accessory",
                "android.hardware.usb.host",
                "android.hardware.wifi",
                "android.hardware.wifi.direct",
                "android.software.live_wallpaper",
                "android.software.sip",
                "android.software.sip.voip",
                "com.cyanogenmod.android",
                "com.cyanogenmod.nfc.enhanced",
                "com.google.android.feature.GOOGLE_BUILD",
                "com.nxp.mifare",
                "com.tmobile.software.themes"])
            .add("nativePlatform", "armeabi-v7a")
            .add("nativePlatform", "armeabi")
            .setScreenWidth(720)
            .setScreenHeight(1184)
            .set("systemSupportedLocale", [
                "af", "af_ZA", "am", "am_ET", "ar", "ar_EG", "bg", "bg_BG",
                "ca", "ca_ES", "cs", "cs_CZ", "da", "da_DK", "de", "de_AT",
                "de_CH", "de_DE", "de_LI", "el", "el_GR", "en", "en_AU",
                "en_CA", "en_GB", "en_NZ", "en_SG", "en_US", "es", "es_ES",
                "es_US", "fa", "fa_IR", "fi", "fi_FI", "fr", "fr_BE",
                "fr_CA", "fr_CH", "fr_FR", "hi", "hi_IN", "hr", "hr_HR",
                "hu", "hu_HU", "in", "in_ID", "it", "it_CH", "it_IT", "iw",
                "iw_IL", "ja", "ja_JP", "ko", "ko_KR", "lt", "lt_LT", "lv",
                "lv_LV", "ms", "ms_MY", "nb", "nb_NO", "nl", "nl_BE",
                "nl_NL", "pl", "pl_PL", "pt", "pt_BR", "pt_PT", "rm",
                "rm_CH", "ro", "ro_RO", "ru", "ru_RU", "sk", "sk_SK", "sl",
                "sl_SI", "sr", "sr_RS", "sv", "sv_SE", "sw", "sw_TZ", "th",
                "th_TH", "tl", "tl_PH", "tr", "tr_TR", "ug", "ug_CN", "uk",
                "uk_UA", "vi", "vi_VN", "zh_CN", "zh_TW", "zu", "zu_ZA"])
            .set("glExtension", [
                "GL_EXT_debug_marker",
                "GL_EXT_discard_framebuffer",
                "GL_EXT_multi_draw_arrays",
                "GL_EXT_shader_texture_lod",
                "GL_EXT_texture_format_BGRA8888",
                "GL_IMG_multisampled_render_to_texture",
                "GL_IMG_program_binary",
                "GL_IMG_read_format",
                "GL_IMG_shader_binary",
                "GL_IMG_texture_compression_pvrtc",
                "GL_IMG_texture_format_BGRA8888",
                "GL_IMG_texture_npot",
                "GL_IMG_vertex_array_object",
                "GL_OES_EGL_image",
                "GL_OES_EGL_image_external",
                "GL_OES_blend_equation_separate",
                "GL_OES_blend_func_separate",
                "GL_OES_blend_subtract",
                "GL_OES_byte_coordinates",
                "GL_OES_compressed_ETC1_RGB8_texture",
                "GL_OES_compressed_paletted_texture",
                "GL_OES_depth24",
                "GL_OES_depth_texture",
                "GL_OES_draw_texture",
                "GL_OES_egl_sync",
                "GL_OES_element_index_uint",
                "GL_OES_extended_matrix_palette",
                "GL_OES_fixed_point",
                "GL_OES_fragment_precision_high",
                "GL_OES_framebuffer_object",
                "GL_OES_get_program_binary",
                "GL_OES_mapbuffer",
                "GL_OES_matrix_get",
                "GL_OES_matrix_palette",
                "GL_OES_packed_depth_stencil",
                "GL_OES_point_size_array",
                "GL_OES_point_sprite",
                "GL_OES_query_matrix",
                "GL_OES_read_format",
                "GL_OES_required_internalformat",
                "GL_OES_rgb8_rgba8",
                "GL_OES_single_precision",
                "GL_OES_standard_derivatives",
                "GL_OES_stencil8",
                "GL_OES_stencil_wrap",
                "GL_OES_texture_cube_map",
                "GL_OES_texture_env_crossbar",
                "GL_OES_texture_float",
                "GL_OES_texture_half_float",
                "GL_OES_texture_mirrored_repeat",
                "GL_OES_vertex_array_object",
                "GL_OES_vertex_half_float"]))
            // deviceClass
            // maxApkDownloadSizeMb
        .add("macAddrType", "wifi")
        .setFragment(0);
  }

  function loadRequest(data) {
    var msg = AndroidCheckinRequest.decode(data);
    return msg;
  }

  function loadResponse(data) {
    var msg = AndroidCheckinResponse.decode(data);
    return msg;
  }

  return {
    generateMeid: generateMeid,
    generateMacAddr: generateMacAddr,
    generateSerialNumber: generateSerialNumber,
    generateCheckinPayload: generateCheckinPayload,
    loadRequest: loadRequest,
    loadResponse: loadResponse
  };
};

