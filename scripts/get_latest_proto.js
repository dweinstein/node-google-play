#!/usr/bin/env node
var https = require('https');
var fs = require('fs');
var split = require('split');
var through = require('through2').obj;

var file = fs.createWriteStream(__dirname+'/../lib/data/googleplay.proto');
var url = "https://raw.githubusercontent.com/dweinstein/google-play-proto/v1.0.3/googleplay.proto";

var request = https.get(url, function(response) {
  if (response.statusCode != 200) {
    console.error(url);
    console.error(response.statusMessage);
    process.exit(1);
  }
  response
  .pipe(split())
  .pipe(through(function (chunk, enc, cb) {
    cb(null, chunk.replace(/bytes/,'string')+'\n');
  }))
  .pipe(file);
});

