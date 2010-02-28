# node_webstream

* Simple TCP style communication with the browser using websockets or long polling.
* jQuery client
* No handshaking, sessions, channels: build what you want

## Todo

* Streaming support instead of just long polling.
* Better error handling (in many situations just any error handling).
* More examples (a channels example? node_chat type example)

## Usage

See example folder for a working example

### Server side (Node)

Based on TCP in node.

<pre><code>// Server
var webstream = require("./lib/webstream");
webstream.createServer(function (user) {
  user.addListener('connect', function () {
    // User connected
	
	// Send data to user
	user.write(string);
  });
  user.addListener('data', function (data) {
    // Incoming data
  });
  user.addListener('close', function () {
    // User lost
  });
});

// Attach to HTTP and WebSocket servers

http.createServer(function (req, res) {
  testWebStream.httpReq(req, res);
}).listen(8001);

// Use http://github.com/Guille/node.websocket.js for websockets
var ws = require("./lib/deps/ws");
ws.createServer(function (websocket) {
  testWebStream.wsReq(websocket);
}).listen(8002);

</code></pre>

### Client side (jQuery)

Based on ajax request in jquery

<pre><code>var stream = $.webstream({
  // URL for websocket server
  webSocket: 'ws://localhost:8002',
  // Relative URL for http server
  http: '/webstream',
  open: function () {
    // Connected to server
  },
  data: function (data) {
    // Data from server
  },
  close: function () {
    // Lost connection
  },
  error: function () {
    // Error with connection
  }
});

// Write to stream
stream.write(string);
</code></pre>

