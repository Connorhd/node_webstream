jQuery.webstream = function(settings) {
  var webstream = {};
  if (settings.webSocket !== undefined && "WebSocket" in window) {
    // We have WebSocket support
    var ws = new WebSocket(settings.webSocket);
    webstream.webSocket = ws;
    ws.onopen = function () {
    if (settings.open !== undefined) {
      settings.open();
      }
    };
    ws.onmessage = function (e) {
    if (settings.data !== undefined) {
      settings.data(e.data);
      }
    };
    webstream.write = function (data) {
    ws.send(data);
    };
  } else if (settings.http !== undefined) {
    // No websockets, fall back (currently only long polling supported)
    var listenRequest = function () {
    $.ajax({
      type: "GET",
      url: settings.http,
      cache: false,
      data: "method=longpoll&request=listen&id="+webstream.longpoll.id,
      dataType: 'json',
      timeout: webstream.longpoll.timeout,
      success: function (data) {
      if (settings.data !== undefined) {
        $.each(data, function (i, x) {
        settings.data(x);
        });
      }
      },
      complete: function () {
      listenRequest();
      }
    });
    };
    $.ajax({
    type: "GET",
    url: settings.http,
    cache: false,
    data: "method=longpoll&request=connect",
    dataType: 'json',
    timeout: 30000,
    success: function (data) {
      webstream.longpoll = {
      id: data.id,
      timeout: data.timeout
      };
      if (settings.open !== undefined) {
      settings.open();
      }
      listenRequest();
    },
    error: function () {
      if (settings.error !== undefined) {
      settings.error();
      }
    }
    });
    webstream.write = function (data) {
    $.ajax({
      type: "POST",
      url: settings.http+"?method=longpoll&request=write&id="+webstream.longpoll.id,
      cache: false,
      data: data,
      timeout: webstream.longpoll.timeout
     });
    };
    window.onbeforeunload = function () { 
    $.ajax({
      type: "GET",
      url: settings.http,
      cache: false,
      data: "method=longpoll&request=close&id="+webstream.longpoll.id,
      timeout: webstream.longpoll.timeout
     });
    }
  } else {
    // No connection
    if (settings.error !== undefined) {
    settings.error();
    }
  }
  return webstream;
};