HOST = null; // localhost
HTTPPORT = 8001;
WSPORT = 8002;

var webstream = require("../../lib/webstream");
var sys = require("sys");
var http = require("http");
var ws = require("../../lib/deps/ws");
var fu = require("./fu");

var testWebStream = webstream.createServer(function (user) {
  var minutes = 1;
  user.addListener('connect', function () {
    sys.puts('User connected');
    setInterval(function () { user.write("Connected for "+minutes+++" minute(s).") }, 60000);
  });
  user.addListener('data', function (data) {
    if (data.substring(0,4) == 'PING') {
	  user.write('PONG'+data.substring(4));
	}
    sys.puts('User data: '+data);
  });
  user.addListener('close', function () {
    sys.puts('User lost');
  });
});

fu.listen(HTTPPORT, HOST);
fu.get("/", fu.staticHandler("index.html"));
fu.get("/jquery-1.4.2.min.js", fu.staticHandler("../../jquery/deps/jquery-1.4.2.min.js"));
fu.get("/jquery.webstream.js", fu.staticHandler("../../jquery/jquery.webstream.js"));

fu.get("/webstream", function (req, res) { testWebStream.httpReq(req, res) });


ws.createServer(function (websocket) {
  testWebStream.wsReq(websocket);
}).listen(WSPORT, HOST);

