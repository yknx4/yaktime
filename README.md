# yaktime

[![NPM Packagke](https://img.shields.io/npm/v/yaktime.svg?style=flat)](https://www.npmjs.com/package/yaktime)
[![Build Status](https://img.shields.io/travis/com/yknx4/yaktime.svg?style=flat)](https://travis-ci.com/yknx4/yaktime)
[![NPM Downloads](https://img.shields.io/npm/dt/yaktime.svg?style=flat)](https://www.npmjs.com/package/yaktime)
![](https://img.shields.io/david/yknx4/yaktime.svg?style=flat)
![](https://img.shields.io/codecov/c/github/yknx4/yaktime.svg?style=flat)
[![DeepScan grade](https://deepscan.io/api/teams/2882/projects/4319/branches/35118/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=2882&pid=4319&bid=35118)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/yknx4/yaktime.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/yknx4/yaktime/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/yknx4/yaktime.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/yknx4/yaktime/context:javascript)

Record HTTP interactions The Node Way™. Inspired by ruby's [vcr][1].

> This is a complete rewrite of original project [yakbak](https://github.com/flickr/yakbak) in Typescript.
>
> All existing tapes works with this implementation

## install

```bash
$ npm install yaktime --save-dev
```

## usage

The main idea behind testing HTTP clients with yaktime is:

1. Make your client's target host configurable.
2. Set up a yaktime server locally to proxy the target host.
3. Point your client at the yaktime server.

Then develop or run your tests. If a recorded HTTP request is found on disk, it will be played back instead of hitting the target host. If no recorded request is found, the request will be forwarded to the target host and recorded to disk.

### yaktime(host, options)

Returns a function of the signature `function (req, res)` that you can give to an `http.Server` as its handler.

```js
const handler = yaktime("http://api.flickr.com", {
  dirname: __dirname + "/tapes"
});
```

#### options

- `dirname` the path where recorded responses will be written (required).
- `noRecord` if true, requests will return a 404 error if the tape doesn't exist
- `recordOnlySuccess` if true, only successful requests (response status code = 2XX) will be recorded
- `hash(req, body)` provide your own IncomingMessage hash function

### with node's http module

yaktime provides a handler with the same signature that `http.Server` expects so you can create your own proxy:

```js
const http = require("http");
const { yaktime } = require("yaktime");

http
  .createServer(
    yaktime("http://api.flickr.com", {
      dirname: __dirname + "/tapes"
    })
  )
  .listen(3000);
```

Now any requests to `http://localhost:3000` will be proxied to `http://api.flickr.com` and recorded to `/tapes` for future playback.

### with express

Need more flexibility? [express](https://github.com/expressjs/express) expects the same function signature, so you can use yaktime just like you would any other middleware:

```js
const express = require("express");
const { yaktime } = require("yaktime");

const flickr = yaktime("http://api.flickr.com", {
  dirname: __dirname + "/tapes"
});

const upload = yaktime("http://up.flickr.com", {
  recordOnlySuccess: true,
  dirname: __dirname + "/tapes"
});

const app = express();

app.use(function(req, res, next) {
  if (req.path.indexOf("/services/upload") === 0) {
    upload(req, res);
  } else {
    flickr(req, res);
  }
});

function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}
app.use(logErrors);
function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: "Something failed!" });
  } else {
    next(err);
  }
}
app.use(clientErrorHandler);
function errorHandler(err, req, res, next) {
  res.status(500);
  res.render("error", { error: err });
}
app.use(errorHandler);

app.listen(3000);
```

### as a standalone response server

Each recorded response is itself a node module with the same handler signature, so if you want to create a server that replays a single response, you can do so easily:

```js
const http = require("http");
const tape = require("./tapes/1117f3d81490d441d826dd2fb26470f9.js");

http.createServer(tape).listen(3000);
```

### on the command line

yaktime also ships with a `yaktime` utility that will start an HTTP server to play back a given tape.

```bash
$ yaktime
Error: file is required
Usage: yaktime <file>
$ yaktime ./tapes/1117f3d81490d441d826dd2fb26470f9.js
Server listening on port 3000
* Connection from 127.0.0.1 port 63669
< GET / HTTP/1.1
< host: localhost:3000
< user-agent: curl/7.43.0
< accept: */*
<
> HTTP/1.1 201 Created
> content-type: text/html
> date: Sat, 26 Oct 1985 08:20:00 GMT
> connection: close
> transfer-encoding: chunked
>
* Connection closed
```

## why not [insert other project here]?

Check out [this blog post][2] about why we chose a reverse proxy over other existing approaches to recording HTTP interactions.

## license

This software is free to use under the MIT license. See the [LICENSE][] file for license text and copyright information.

[1]: https://github.com/vcr/vcr
[2]: http://code.flickr.net/2016/04/25/introducing-yaktime-record-and-playback-http-interactions-in-nodejs/
[license]: https://github.com/yknx4/yaktime/blob/master/LICENSE
