'use strict';

let badge = false;
let tab;

const app = {
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

const refresh = () => chrome.storage.local.get({
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

const getHost = tab => tab.url.split('://')[1].split('/')[0];

const js = {
  whitelist: [],
  blacklist: [],
  whiteListen: d => {
    const hostname = getHost(d);
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
    const hostname = getHost(d);
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
    app.title(chrome.i18n.getMessage('bg_disable'));
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
    app.title(chrome.i18n.getMessage('bg_enable'));
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
const onClicked = t => {
  tab = t;
  chrome.storage.local.get({
    state: true
  }, prefs => {
    prefs.state = !prefs.state;
    chrome.storage.local.set(prefs);
  });
};
chrome.browserAction.onClicked.addListener(onClicked);
chrome.commands.onCommand.addListener(() => {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (tabs && tabs.length) {
      onClicked(tabs[0]);
    }
  });
});
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
    id: 'separator',
    type: 'separator',
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });
  chrome.contextMenus.create({
    id: 'whitelist-toggle',
    title: 'Add to or remove from whitelist',
    contexts: ['browser_action'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });
  chrome.contextMenus.create({
    id: 'blacklist-toggle',
    title: 'Add to or remove from blacklist',
    contexts: ['browser_action'],
    documentUrlPatterns: ['http://*/*', 'https://*/*']
  });

  chrome.contextMenus.onClicked.addListener((info, t) => {
    if (info.menuItemId === 'open-test-page') {
      chrome.tabs.create({
        url: 'https://webbrowsertools.com/javascript/?rand=' + Math.random()
      });
    }
    else if (info.menuItemId === 'open-settings') {
      chrome.runtime.openOptionsPage();
    }
    else if (info.menuItemId === 'whitelist-toggle' || info.menuItemId === 'blacklist-toggle') {
      const hostname = getHost(t);
      const type = info.menuItemId.replace('-toggle', '');
      const index = js[type].indexOf(hostname);
      if (index > -1) {
        js[type].splice(index, 1);
      }
      else {
        js[type].push(hostname);
      }
      chrome.notifications.create({
        title: chrome.runtime.getManifest().name,
        type: 'basic',
        iconUrl: 'data/icons/48.png',
        message: index > -1 ? `"${hostname}" is removed from the ${type}` : `"${hostname}" is added to the ${type}`
      });
      chrome.storage.local.set({
        [type]: js[type]
      }, () => {
        tab = t;
        refresh();
      });
    }
  });
}
// FAQs & Feedback
{
  const {onInstalled, setUninstallURL, getManifest} = chrome.runtime;
  const {name, version} = getManifest();
  const page = getManifest().homepage_url;
  onInstalled.addListener(({reason, previousVersion}) => {
    chrome.storage.local.get({
      'faqs': true,
      'last-update': 0
    }, prefs => {
      if (reason === 'install' || (prefs.faqs && reason === 'update')) {
        const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
        if (doUpdate && previousVersion !== version) {
          chrome.tabs.create({
            url: page + '?version=' + version +
              (previousVersion ? '&p=' + previousVersion : '') +
              '&type=' + reason,
            active: reason === 'install'
          });
          chrome.storage.local.set({'last-update': Date.now()});
        }
      }
    });
  });
  setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
}
