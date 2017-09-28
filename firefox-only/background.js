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
  refresh: true
}, prefs => {
  console.log(prefs, tab)
  if (prefs.refresh && tab && tab.url && tab.url.startsWith('http')) {
    chrome.tabs.reload(tab.id);
  }
  tab = null;
});

var js = {
  whitelist: [],
  blacklist: [],
  whiteListen: d => {
    const hostname = d.url.split('://')[1].split('/')[0];
    for (const h of js.whitelist) {
      if (hostname.endsWith(h)) {
        return;
      }
    }
    const responseHeaders = d.responseHeaders;
    responseHeaders.push({
      'name': 'Content-Security-Policy',
      'value': 'script-src \'none\''
    });
    return {responseHeaders};
  },
  blackListen: d => {
    const hostname = d.url.split('://')[1].split('/')[0];
    for (const h of js.blacklist) {
      if (hostname.endsWith(h)) {
        const responseHeaders = d.responseHeaders;
        responseHeaders.push({
          'name': 'Content-Security-Policy',
          'value': 'script-src \'none\''
        });
        return {responseHeaders};
      }
    }
    return;
  },
  enable: () => {
    chrome.webRequest.onHeadersReceived.removeListener(js.whiteListen);
    chrome.webRequest.onHeadersReceived.addListener(
      js.blackListen,
      {
        'urls': ['*://*/*'],
        'types': [
          'main_frame',
          'sub_frame'
        ]
      },
      ['blocking', 'responseHeaders']
    );
    window.setTimeout(refresh, 10);
    app.icon();
    app.title('JavaScript is Enabled');
  },
  disable: () => {
    chrome.webRequest.onHeadersReceived.removeListener(js.blackListen);
    chrome.webRequest.onHeadersReceived.addListener(
      js.whiteListen,
      {
        'urls': ['*://*/*'],
        'types': [
          'main_frame',
          'sub_frame'
        ]
      },
      ['blocking', 'responseHeaders']
    );
    window.setTimeout(refresh, 10);
    app.icon('/n');
    app.title('JavaScript is Disabled');
  }
};

chrome.storage.local.get({
  state: true,
  whitelist: [],
  blacklist: []
}, prefs => {
  js.whitelist = prefs.whitelist;
  js.blacklist = prefs.blacklist;
  js[prefs.state ? 'enable' : 'disable']();
});

chrome.storage.onChanged.addListener(prefs => {
  if (prefs.state) {
    js[prefs.state.newValue ? 'enable' : 'disable']();
  }
  if (prefs.whitelist) {
    js.whitelist = prefs.whitelist.newValue;
  }
  if (prefs.blacklist) {
    js.blacklist = prefs.blacklist.newValue;
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
chrome.contextMenus.create({
  id: 'open-settings',
  title: 'Open settings',
  contexts: ['browser_action']
});
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'open-test-page') {
    chrome.tabs.create({
      url: 'http://tools.add0n.com/check-javascript.html?rand=' + Math.random()
    });
  } else if(info.menuItemId === 'open-settings') {
    chrome.tabs.create({
      url: browser.extension.getURL("data/options/index.html")
    });
  }
});
//
chrome.storage.local.get('version', prefs => {
  const version = chrome.runtime.getManifest().version;
  // display FAQs only on install
  if (!prefs.version) {
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
