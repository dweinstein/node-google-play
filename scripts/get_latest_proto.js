#!/usr/bin/env node
var https = require('https');
var fs = require('fs');
var split = require('split');
var through = require('through2').obj;
var fmt = require('util').format;

var BASE_URL = 'https://raw.githubusercontent.com/dweinstein/google-play-proto/%s/%s';
var VER = 'v1.1.0';

function bytesToString (chunk, enc, cb) {
  process.nextTick(function () {
    cb(null, chunk.replace(/bytes/, 'string') + '\n');
  });
}

function unsplit (chunk, enc, cb) {
  process.nextTick(function () {
    return cb(null, chunk + '\n');
  });
}

function rel (path) {
  return __dirname + path;
}

function urlForVerPath (ver, path) {
  return fmt(BASE_URL, ver, path);
}

var files = [
  {
    path: rel('/../lib/data/googleplay.proto'),
    url: urlForVerPath(VER, 'googleplay.proto'),
    through: bytesToString
  },
  {
    path: rel('/../lib/data/checkin.proto'),
    url: urlForVerPath(VER, 'checkin/checkin_merged.proto'),
    through: unsplit
  }
];

function done (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
}

var count = files.length;

if (count > 0) {
  files.forEach(function (info) {
    var url = info.url;
    var path = info.path;
    var middle = info.through;

    https.get(url, function (response) {
      if (response.statusCode !== 200) {
        return done(new Error(fmt('url %s failed, message: %s', url, response.statusMessage)));
      }

      var file = fs.createWriteStream(path);

      response
        .pipe(split())
        .pipe(through(middle))
        .pipe(file, {end: true});

      response.once('end', function () {
        if (--count <= 0) done();
      });
    });
  });
}
