'use strict';

// Load Firefox based resources
var self          = require('sdk/self'),
    sp            = require('sdk/simple-prefs'),
    prefs         = sp.prefs,
    tabs          = require('sdk/tabs'),
    timers        = require('sdk/timers'),
    unload        = require('sdk/system/unload'),
    buttons       = require('sdk/ui/button/action'),
    pService      = require('sdk/preferences/service'),
    {Ci, Cc, Cu}  = require('chrome');

//var {WebRequest} = Cu.import('resource://gre/modules/WebRequest.jsm');
var {MatchPattern} = Cu.import('resource://gre/modules/MatchPattern.jsm');
var {Services} = Cu.import('resource://gre/modules/Services.jsm');

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
  open: (url) => tabs.open({url})
};

exports.version = () => self.version;

exports.timers = timers;

exports.startup = function (callback) {
  if (self.loadReason === 'install' || self.loadReason === 'startup') {
    callback();
  }
};

exports.unload = function (c) {
  unload.when(function (e) {
    if (e === 'shutdown') {
      return;
    }
    c();
  });
};

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

exports.contentSettings = {
  javascript: {
    set: (obj) => pService.set('javascript.enabled', obj.setting === 'allow')
  }
};

exports.contextMenus = (function () {
  let cache = new WeakMap();
  let NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
  let properties = {};

  function attach (window) {
    function load () {
      window.removeEventListener('load', load);
      let menupopup = window.document.getElementById('toolbar-context-menu');
      if (!menupopup) {
        return;
      }
      let menuseparator = window.document.createElementNS(NS_XUL, 'menuseparator');
      menuseparator.setAttribute('id', self.name + 'menuseparator');
      menuseparator.setAttribute('hidden', true);
      menupopup.appendChild(menuseparator);
      let menuitem = window.document.createElementNS(NS_XUL, 'menuitem');
      menuitem.setAttribute('id', self.name + 'menuitem');
      menuitem.setAttribute('label', properties.title);
      menuitem.addEventListener('command', properties.onclick);
      menuitem.setAttribute('hidden', true);
      menupopup.appendChild(menuitem);

      function onContext (e) {
        let target = e.target;
        let doc = target.ownerDocument.defaultView.document;
        let menuitem = doc.getElementById(self.name + 'menuitem');
        let menuseparator = doc.getElementById(self.name + 'menuseparator');
        if (menuitem) {
          menuitem.setAttribute('hidden', target.id.indexOf(self.name) === -1);
        }
        if (menuseparator) {
          menuseparator.setAttribute('hidden', target.id.indexOf(self.name) === -1);
        }
      }
      window.addEventListener('contextmenu', onContext, true);
      cache.set(window, onContext);
    }
    if (window.document.readyState === 'complete') {
      load();
    }
    else {
      window.addEventListener('load', load);
    }
  }

  let WindowListener = {
    onOpenWindow: function(xulWindow) {
      let window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIDOMWindow);
      attach(window);
    }
  };

  unload.when(function (e) {
    if (e === 'shutdown') {
      return;
    }
    Services.wm.removeListener(WindowListener);
    let windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
      let win = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
      if (cache.has(win)) {
        win.removeEventListener('contextmenu', cache.get(win), true);
        let menuitem = win.document.getElementById(self.name + 'menuitem');
        let menuseparator = win.document.getElementById(self.name + 'menuseparator');
        if (menuitem) {
          menuitem.parentNode.removeChild(menuitem);
        }
        if (menuseparator) {
          menuseparator.parentNode.removeChild(menuseparator);
        }
      }
    }
  });

  return {
    create: function (obj) {
      properties = obj;
      Services.wm.addListener(WindowListener);
      let windows = Services.wm.getEnumerator('navigator:browser');
      while (windows.hasMoreElements()) {
        attach(windows.getNext().QueryInterface(Ci.nsIDOMWindow));
      }
    }
  };
})();

