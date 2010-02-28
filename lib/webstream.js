var sys = require('sys');
var events = require('events');

// Basic WebStream server structure

function Server() {
  // New WebStream server
  events.EventEmitter.call(this);
  this.users = {};
}
sys.inherits(Server, events.EventEmitter);
exports.Server = Server;

exports.createServer = function (webStreamListener) {
  var server = new Server();
  server.addListener('connection', webStreamListener);
  return server;
};

// Request handlers

// Websocket Handler
Server.prototype.wsReq = function (ws) {
  var user = new WSUser();
  user.ws = ws;
  this.emit('connection', user);
  ws.addListener("connect", function (resource) { 
    user.emit('connect');
  }).addListener("data", function (data) { 
    user.emit('data', data);
  }).addListener("close", function () { 
    user.emit('close');
  });
}

// Websocket User

function WSUser() {
  events.EventEmitter.call(this);
}
sys.inherits(WSUser, events.EventEmitter);

WSUser.prototype.write = function (data) {
  this.ws.write(data);
};

// HTTP Handler
Server.prototype.httpReq = function (req, res) {
  // Handle req
  req.parsedUrl = require("url").parse(req.url, true);
  if (req.parsedUrl.query !== undefined &&
      req.parsedUrl.query.method !== undefined &&
      req.parsedUrl.query.request !== undefined &&
      handlers[req.parsedUrl.query.method] !== undefined &&
      handlers[req.parsedUrl.query.method][req.parsedUrl.query.request] !== undefined) {
    handlers[req.parsedUrl.query.method][req.parsedUrl.query.request](this, req, res);
  } else {
   res.writeHeader(200, {"Content-Type": "text/plain"});
   res.close();
  }
};

handlers = {};

// Long polling

function LongPollUser(server) {
  events.EventEmitter.call(this);
  this.id = 'id'+Math.floor(Math.random()*999999999); // TODO: Better session ids?
  this.server = server;
  this.queue = [];
}
sys.inherits(LongPollUser, events.EventEmitter);

LongPollUser.prototype.write = function (data) {
  this.queue.push(data.toString());
  this.sendResponse();
};

LongPollUser.prototype.resetTimeout = function () {
  if (this.timeout !== undefined) 
    clearTimeout(this.timeout);
  var user = this;
  var server = this.server;
  this.timeout = setTimeout(function () {
    user.emit('close');
    delete server.users[user.id];
  }, this.server.longPollTimeout*2);
};

LongPollUser.prototype.sendResponse = function () {
  if (this.curRes !== undefined) {
    if (this.queue.length > 0) {
      if (this.resTimeout !== undefined) {
        clearTimeout(this.resTimeout);
        delete this.resTimeout;
      }
      this.curRes.writeHeader(200, {"Content-Type": "text/plain"});
      this.curRes.write('["'+this.queue.join('","')+'"]');
      this.curRes.close();
      this.queue = [];
      delete this.curRes;
    } else {
      if (this.resTimeout !== undefined) 
        clearTimeout(this.resTimeout);
    
      var user = this;
      this.resTimeout = setTimeout(function () {
            user.curRes.writeHeader(200, {"Content-Type": "text/plain"});
            user.curRes.close();
      }, this.server.longPollTimeout)
    }
  }
}

// Timeout on long poll requests
Server.prototype.longPollTimeout = 30000;

handlers.longpoll = {
  'connect': function (server, req, res) {
    var user = new LongPollUser(server);
    server.users[user.id] = user;

    server.emit('connection', user);
    user.emit('connect');

    user.resetTimeout();
    res.writeHeader(200, {"Content-Type": "text/plain"});
    res.write('{"id":"'+user.id+'","timeout":'+server.longPollTimeout+'}');
    res.close();
  },
  'write': function (server, req, res) {
    if (req.parsedUrl.query.id !== undefined &&
        server.users[req.parsedUrl.query.id] !== undefined) {
      var user = server.users[req.parsedUrl.query.id];
      var body = '';
      req.addListener("data", function (chunk) {
        body += chunk;
      });
      req.addListener("end", function () {
        try {
          user.emit('data', body);
        } catch (e) {}
      });
    }
    res.writeHeader(200, {"Content-Type": "text/plain"});
    res.close();
  },
  'listen': function (server, req, res) {
    if (req.parsedUrl.query.id !== undefined &&
        server.users[req.parsedUrl.query.id] !== undefined) {
      var user = server.users[req.parsedUrl.query.id];
      user.curRes = res;
      user.sendResponse();
      user.resetTimeout();
    } else {
      res.writeHeader(200, {"Content-Type": "text/plain"});
      res.close();
    }    
  },
  'close': function (server, req, res) {
    if (req.parsedUrl.query.id !== undefined &&
        server.users[req.parsedUrl.query.id] !== undefined) {
      var user = server.users[req.parsedUrl.query.id];
      if (user.timeout !== undefined) 
        clearTimeout(user.timeout);
      user.emit('close');
      delete server.users[user.id];
    }
    res.writeHeader(200, {"Content-Type": "text/plain"});
    res.close();
  }
};
