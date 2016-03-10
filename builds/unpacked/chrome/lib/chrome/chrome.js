'use strict';

var app = new EventEmitter();

app.globals = {
  browser: navigator.userAgent.indexOf('OPR') === -1 ? 'chrome' : 'opera'
};

app.once('load', function () {
  let script = document.createElement('script');
  document.body.appendChild(script);
  script.src = '../background.js';
});

app.Promise = Promise;

// EventEmitter
app.EventEmitter = EventEmitter;

app.storage = (function () {
  let objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    app.emit('load');
  });
  return {
    read: (id) => objs[id],
    write: (id, data) => {
      objs[id] = data;
      let tmp = {};
      tmp[id] = data;
      chrome.storage.local.set(tmp, function () {});
    }
  };
})();

app.button = (function () {
  let onCommand;
  chrome.browserAction.onClicked.addListener(function () {
    if (onCommand) {
      onCommand();
    }
  });
  return {
    onCommand: (c) => onCommand = c,
    set icon (root) { // jshint ignore: line
      chrome.browserAction.setIcon({
        path: {
          '19': '../../data/' + root + '/19.png',
          '38': '../../data/' + root + '/38.png'
        }
      });
    },
    set label (label) { // jshint ignore: line
      chrome.browserAction.setTitle({
        title: label
      });
    }
  };
})();

app.tab = {
  open: (url) => chrome.tabs.create({
    url: url,
    active: true
  }),
  list: function () {
    var d = app.Promise.defer();
    chrome.tabs.query({
      currentWindow: false
    }, function (tabs) {
      d.resolve(tabs);
    });
    return d.promise;
  }
};

app.notification = (title, text) => chrome.notifications.create(null, {
  type: 'basic',
  iconUrl: chrome.extension.getURL('./') + 'data/icons/48.png',
  title: title,
  message: text
}, function () {});

app.version = () => chrome[chrome.runtime && chrome.runtime.getManifest ? 'runtime' : 'extension'].getManifest().version;

app.timers = window;

app.startup = (function () {
  let loadReason, callback;
  function check () {
    if (loadReason === 'startup' || loadReason === 'install') {
      if (callback) {
        callback();
      }
    }
  }
  chrome.runtime.onInstalled.addListener(function (details) {
    loadReason = details.reason;
    check();
  });
  chrome.runtime.onStartup.addListener(function () {
    loadReason = 'startup';
    check();
  });
  return (c) => {
    callback = c;
    check();
  };
})();

app.unload = function () {};

app.MatchPattern = function (arr) {
  return arr;
}
app.webRequest = chrome.webRequest;
