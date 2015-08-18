import rc from 'rc';
import Debug from 'debug';
import minimist from 'minimist';
const debug = Debug('config');
export default rc('gpapi', {
  username: process.env.GOOGLE_LOGIN || "fakeuser@gmail.com",
  password: process.env.GOOGLE_PASSWORD || "fakepassword",
  androidId: process.env.ANDROID_ID || "fakeandroidid",
  fdfe: {
    url: "https://android.clients.google.com/fdfe/%s",
    login: "https://android.clients.google.com/auth"
  }
}, minimist(process.argv.slice(2), {
  alias: {
    'android-id': 'androidId'
  }
}));
debug(exports);
