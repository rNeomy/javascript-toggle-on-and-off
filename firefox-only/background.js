'use strict';

var tab;
var badge = false;

var app = {
  title: title => {
    chrome.browserAction.setTitle({
      title
    });
  },
  icon: (path = '') => {
    if (chrome.browserAction.setIcon) {
      chrome.browserAction.setIcon({
        path: {
          '19': 'data/icons' + path + '/19.png',
          '38': 'data/icons' + path + '/38.png'
        }
      });
    }
    if (badge && chrome.browserAction.setBadgeText) {
      chrome.browserAction.setBadgeText({
        text: path ? 'd' : ''
      });
    }
  }
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
    app.title('Click to disable JavaScript');
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
    app.title('Click to enable JavaScript');
  }
};

chrome.storage.local.get({
  state: true,
  badge: false,
  whitelist: [],
  blacklist: []
}, prefs => {
  badge = prefs.badge;
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
  if (prefs.badge) {
    badge = prefs.badge.newValue;
  }
});
//
var onClicked = t => {
  tab = t;
  chrome.storage.local.get({
    state: true
  }, prefs => {
    prefs.state = !prefs.state;
    chrome.storage.local.set(prefs);
  });
};
chrome.browserAction.onClicked.addListener(onClicked);
//
if (chrome.contextMenus) {
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
  chrome.contextMenus.create({
    id: 'lists-separator',
    type: 'separator'
  });
  chrome.contextMenus.create({
    id: 'whitelist-this',
    title: 'Whitelist this website',
    type: 'checkbox',
    contexts: ['browser_action']
  });
  chrome.contextMenus.create({
    id: 'blacklist-this',
    title: 'Blacklist this website',
    type: 'checkbox',
    contexts: ['browser_action']
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'open-test-page') {
      chrome.tabs.create({
        url: 'http://tools.add0n.com/check-javascript.html?rand=' + Math.random()
      });
    }
    else if (info.menuItemId === 'open-settings') {
      chrome.runtime.openOptionsPage();
    }
    else if (info.menuItemId === 'toggle-action') {
      onClicked(tab);
    }
	else if(tab.url.startsWith('http') && (info.menuItemId === 'whitelist-this' || info.menuItemId === 'blacklist-this')) {
      var url = tab.url.split('://')[1].split('/')[0];
      if(info.menuItemId === 'whitelist-this') {
        var index = js.whitelist.indexOf(url);
        if(index > -1) {
          js.whitelist.splice(index, 1);
        } else {
          js.whitelist[js.whitelist.length] = url;
        }
      } else if(info.menuItemId === 'blacklist-this') {
        var index = js.blacklist.indexOf(url);
        if(index > -1) {
          js.blacklist.splice(index, 1);
        } else {
          js.blacklist[js.blacklist.length] = url;
        }
      }
      chrome.storage.local.set({
        whitelist: js.whitelist,
        blacklist: js.blacklist
      }, () => {
        chrome.storage.local.get({
          refresh: true
        }, prefs => {
          if (prefs.refresh) {
          browser.tabs.reload(tab.id);
          }
        });
      });
    }
  });
}
//
function tabListener(tabId) {
  browser.tabs.get(tabId).then(function(tabInfo) {
    if(tabInfo.url.startsWith('http')) {
      var url = tabInfo.url.split('://')[1].split('/')[0];
      browser.menus.update("whitelist-this", {
        title: 'Whitelist this website (' + url + ')',
        enabled: true,
        checked: js.whitelist.indexOf(url) > -1,
      });
      browser.menus.update("blacklist-this", {
        title: 'Blacklist this website (' + url + ')',
        enabled: true,
        checked: js.blacklist.indexOf(url) > -1,
      });
    } else {
      browser.menus.update("whitelist-this", {
        title: 'Whitelist this website',
        enabled: false,
        checked: false,
      });
      browser.menus.update("blacklist-this", {
        title: 'Blacklist this website',
        enabled: false,
        checked: false,
      });
    }
  }, function(error) {
    console.log(`Error: ${error}`);
  });
}
browser.tabs.onActivated.addListener(function(activeInfo) {
  tabListener(activeInfo.tabId);
});
browser.tabs.onUpdated.addListener(tabListener);
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
