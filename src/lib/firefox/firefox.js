'use strict';

// Load Firefox based resources
var self          = require('sdk/self'),
    data          = self.data,
    sp            = require('sdk/simple-prefs'),
    prefs         = sp.prefs,
    notifications = require('sdk/notifications'),
    tabs          = require('sdk/tabs'),
    timers        = require('sdk/timers'),
    unload        = require('sdk/system/unload'),
    buttons       = require('sdk/ui/button/action'),
    {Ci, Cc, Cu}  = require('chrome'),
    {on, off, once, emit} = require('sdk/event/core'),
    {all, defer, race, resolve}  = require('sdk/core/promise');

//var {WebRequest} = Cu.import('resource://gre/modules/WebRequest.jsm');
var {MatchPattern} = Cu.import('resource://gre/modules/MatchPattern.jsm');

exports.globals = {
  browser: 'firefox'
};

// Promise
exports.Promise = function (callback) {
  let d = defer();
  callback(d.resolve, d.reject);
  return d.promise;
};
exports.Promise.defer = defer;
exports.Promise.all = all;
exports.Promise.race = race;
exports.Promise.resolve = resolve;

// Event Emitter
exports.on = on.bind(null, exports);
exports.once = once.bind(null, exports);
exports.emit = emit.bind(null, exports);
exports.removeListener = function removeListener (type, listener) {
  off(exports, type, listener);
};

//toolbar button
exports.button = (function () {
  let callback = function () {};
  let button = buttons.ActionButton({
    id: self.name,
    label: 'toolbar label',
    icon: {
      '18': './icons/16.png',
      '36': './icons/32.png',
      '64': './icons/64.png'
    },
    onClick: () => callback()
  });
  return {
    set icon (root) { // jshint ignore: line
      button.icon = {
        '18': './' + root + '/18.png',
        '36': './' + root + '/36.png',
        '64': './' + root + '/64.png'
      };
    },
    set label (val) { // jshint ignore:line
      button.label = val;
    },
    onCommand: (c) => callback = c
  };
})();

exports.storage = {
  read: (id) => prefs[id],
  write: (id, data) => prefs[id] = data
};

exports.tab = {
  open: (url) => tabs.open({
    url: url,
    inBackground: false
  })
};

exports.version = () => self.version;

exports.timers = timers;

exports.notification = (title, text) => notifications.notify({title, text,
  iconURL: data.url('icons/64.png')
});

exports.startup = function (callback) {
  if (self.loadReason === 'install' || self.loadReason === 'startup') {
    callback();
  }
};

exports.unload = unload.when;

unload.when(function () {
  for each (var tab in tabs) {
    if (tab.url.indexOf(self.data.url('')) === 0) {
      tab.close();
    }
  }
});

exports.MatchPattern = MatchPattern;
// exports.webRequest = WebRequest;
// exports.webRequest is temporary solution until WebRequest.JSM's setResponseHeader is landed
exports.webRequest = (function () {
  let observerService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
  let listener;
  function observe (subject) {
    let channel = subject.QueryInterface(Ci.nsIHttpChannel);
    let loadInfo = channel.loadInfo;
    if (loadInfo) {
      let rawtype = loadInfo.externalContentPolicyType !== undefined ?
          loadInfo.externalContentPolicyType : loadInfo.contentPolicyType;
      if ((rawtype === 6 || rawtype === 7) && listener) {
        listener({responseHeaders: []}).responseHeaders.forEach( function(header) {
          channel.setResponseHeader(header.name, header.value, false);
        });
      }
    }
  }
  return {
    onHeadersReceived: {
      addListener: function (l) {
        listener = l;
        observerService.addObserver(observe, 'http-on-examine-response', false);
      },
      removeListener: function () {
        if (listener) {
          observerService.removeObserver(observe, 'http-on-examine-response');
          listener = null;
        }
      }
    }
  };
})();
