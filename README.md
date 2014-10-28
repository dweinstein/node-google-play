# Build protobuf .desc
```
Â± % protoc --descriptor_set_out=googleplay.desc --include_imports googleplay.proto
```

# Usage
```
var api = GooglePlay(
  process.env.GOOGLE_LOGIN, process.env.GOOGLE_PASSWORD,
  process.env.ANDROID_ID,
  use_cache,
  debug
);

api.login()
.then(function () {
  return api.details("com.viber.voip");
}).then(console.log);
```

# Working
- `details`, `related`, `getDownloadInfo`
