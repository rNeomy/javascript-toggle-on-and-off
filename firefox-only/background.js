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
  listen: d => {
    const hostname = d.url.split('://')[1].split('/')[0];
    for (const h of js.whitelist) {
      if (hostname.startsWith(h) || h.startsWith(hostname)) {
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
  enable: () => {
    chrome.webRequest.onHeadersReceived.removeListener(js.listen);
    window.setTimeout(refresh, 10);
    app.icon();
    app.title('JavaScript is Enabled');
  },
  disable: () => {
    chrome.webRequest.onHeadersReceived.addListener(
      js.listen,
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
  whitelist: []
}, prefs => {
  js.whitelist = prefs.whitelist;
  js[prefs.state ? 'enable' : 'disable']();
});

chrome.storage.onChanged.addListener(prefs => {
  if (prefs.state) {
    js[prefs.state.newValue ? 'enable' : 'disable']();
  }
  if (prefs.whitelist) {
    js.whitelist = prefs.whitelist.newValue;
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
