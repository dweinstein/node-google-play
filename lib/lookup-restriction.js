// as taken from:
// <manifest android:versionCode="80300037" android:versionName="5.0.37"
// package="com.android.vending"
// platformBuildVersionCode="21" platformBuildVersionName="5.0-1471336"
// xmlns:android="http://schemas.android.com/apk/res/android"
// but I don't expect these to change too often.
var availabilityRestrictions = {
  0: ['availability_restriction_generic', "This item isn't available."],
  2: ['availability_restriction_country', "This item isn't available in your country."],
  8: ['availability_restriction_not_in_group', "You're not in the targeted group for this item."],
  9: ['availability_restriction_hardware', "Your device isn't compatible with this item."],
  10: ['availability_restriction_carrier', "This item isn't available on your carrier."],
  11: ['availability_restriction_country_or_carrier', "This item isn't available in your country or on your carrier."],
  12: ['availability_restriction_search_level', "Your content filtering level doesn't allow you to download this item."]
};

module.exports = function (val) {
  return availabilityRestrictions[val];
};
