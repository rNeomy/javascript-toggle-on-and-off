'use strict';

var app = {};

app.storage = (function () {
  let objs = {};
  chrome.storage.local.get(null, function (o) {
    objs = o;
    let script = document.createElement('script');
    document.body.appendChild(script);
    script.src = 'lib/background.js';
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
  open: (url) => chrome.tabs.create({url})
};

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
};
app.webRequest = chrome.webRequest;
app.contentSettings = chrome.contentSettings;
app.contextMenus = chrome.contextMenus;
