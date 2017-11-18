'use strict';

var tab;

var app = {
  title: title => chrome.browserAction.setTitle({
    title: 'JavaScript Toggle On and Off\n\n' + title
  }),
  icon: (path = '') => chrome.browserAction.setIcon({
    path: {
      '19': 'data/icons' + path + '/19.png',
      '38': 'data/icons' + path + '/38.png'
    }
  })
};

var refresh = () => chrome.storage.local.get({
  'refresh-enabled': true,
  'refresh-disabled': true,
  'state': true
}, prefs => {
  if (tab && tab.url && tab.url.startsWith('http')) {
    if ((prefs.state && prefs['refresh-enabled']) || (prefs.state === false && prefs['refresh-disabled'])) {
      chrome.tabs.reload(tab.id, {
        bypassCache: true
      });
    }
  }
  tab = null;
});

var js = {
  enable: () => {
    chrome.contentSettings.javascript.clear({}, refresh);
    app.icon();
    app.title('JavaScript is Enabled');
  },
  disable: () => {
    chrome.contentSettings.javascript.clear({}, () => {
      chrome.contentSettings.javascript.set({
        primaryPattern: '<all_urls>',
        setting: 'block'
      }, refresh);
      chrome.storage.local.get({
        whitelist: []
      }, prefs => {
        prefs.whitelist.forEach(host => chrome.contentSettings.javascript.set({
          primaryPattern: `*://*.${host}/*`,
          setting: 'allow'
        }));
      });
    });
    app.icon('/n');
    app.title('JavaScript is Disabled');
  }
};

function init() {
  chrome.storage.local.get({
    state: true
  }, prefs => {
    js[prefs.state ? 'enable' : 'disable']();
  });
}
init();

chrome.storage.onChanged.addListener(prefs => {
  if (prefs.state) {
    js[prefs.state.newValue ? 'enable' : 'disable']();
  }
  if (prefs.whitelist && !prefs.state) {
    init();
  }
});
//
chrome.browserAction.onClicked.addListener(t => {
  tab = t;
  chrome.storage.local.get({
    state: true
  }, prefs => {
    prefs.state = !prefs.state;
    chrome.storage.local.set(prefs);
  });
});
//
chrome.contextMenus.create({
  id: 'open-test-page',
  title: 'Check JavaScript execution',
  contexts: ['browser_action']
});
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'open-test-page') {
    chrome.tabs.create({
      url: 'http://tools.add0n.com/check-javascript.html?rand=' + Math.random()
    });
  }
});
//
chrome.storage.local.get('version', prefs => {
  const version = chrome.runtime.getManifest().version;
  if (prefs.version !== version) {
    window.setTimeout(() => {
      chrome.storage.local.set({version}, () => {
        chrome.tabs.create({
          url: 'http://add0n.com/javascript-toggler.html?version=' + version +
            '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
        });
      });
    }, 3000);
  }
});
{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
}
