'use strict';

var tab;

var notify = message => chrome.notifications.create({
  title: 'JavaScript Toggle On and Off',
  type: 'basic',
  iconUrl: 'data/icons/48.png',
  message
});

var app = {
  title: title => chrome.browserAction.setTitle({
    title
  }),
  icon: (path = '', badge) => {
    chrome.browserAction.setIcon({
      path: {
        '19': 'data/icons' + path + '/19.png',
        '38': 'data/icons' + path + '/38.png'
      }
    });
    if (badge) {
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
  wildcard: host => `*://*.${host}/*`.replace(/\*\.\*/g, '*'),
  enable: badge => {
    chrome.contentSettings.javascript.clear({}, () => chrome.storage.local.get({
      blacklist: []
    }, prefs => {
      prefs.blacklist.forEach(host => chrome.contentSettings.javascript.set({
        primaryPattern: js.wildcard(host),
        setting: 'block'
      }));
      window.setTimeout(refresh, 10);
    }));
    app.icon('', badge);
    app.title('Click to disable JavaScript');
  },
  disable: badge => {
    chrome.contentSettings.javascript.clear({}, () => {
      chrome.contentSettings.javascript.set({
        primaryPattern: '<all_urls>',
        setting: 'block'
      });
      chrome.storage.local.get({
        whitelist: []
      }, prefs => {
        prefs.whitelist.forEach(host => chrome.contentSettings.javascript.set({
          primaryPattern: js.wildcard(host),
          setting: 'allow'
        }));
        window.setTimeout(refresh, 10);
      });
    });
    app.icon('/n', badge);
    app.title('Click to enable JavaScript');
  }
};

function init() {
  chrome.storage.local.get({
    state: true,
    badge: false
  }, prefs => {
    js[prefs.state ? 'enable' : 'disable'](prefs.badge);
  });
}
init();

chrome.storage.onChanged.addListener(prefs => {
  if (prefs.state) {
    init();
  }
  if (prefs.whitelist && !prefs.state) {
    init();
  }
  if (prefs.blacklist && !prefs.state) {
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
(callback => {
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
})(() => {
  chrome.contextMenus.create({
    id: 'open-test-page',
    title: 'Check JavaScript execution',
    contexts: ['browser_action']
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
});

chrome.contextMenus.onClicked.addListener((info, t) => {
  if (info.menuItemId === 'open-test-page') {
    chrome.tabs.create({
      url: 'http://tools.add0n.com/check-javascript.html?rand=' + Math.random()
    });
  }
  else if (info.menuItemId === 'whitelist-toggle' || info.menuItemId === 'blacklist-toggle') {
    if (t.url.startsWith('http')) {
      const {hostname} = new URL(t.url);
      const type = info.menuItemId.replace('-toggle', '');
      chrome.storage.local.get({
        [type]: []
      }, prefs => {
        const index = prefs[type].indexOf(hostname);
        if (index > -1) {
          prefs[type].splice(index, 1);
        }
        else {
          prefs[type].push(hostname);
        }
        notify(index > -1 ? `"${hostname}" is removed from the ${type}` : `"${hostname}" is added to the ${type}`);
        tab = t;
        chrome.storage.local.set(prefs);
      });
    }
    else {
      notify('This extension only works on HTTP and HTTPS schemes');
    }
  }
});

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': navigator.userAgent.indexOf('Firefox') === -1,
  'last-update': 0,
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    const now = Date.now();
    const doUpdate = (now - prefs['last-update']) / 1000 / 60 / 60 / 24 > 30;
    chrome.storage.local.set({
      version,
      'last-update': doUpdate ? Date.now() : prefs['last-update']
    }, () => {
      // do not display the FAQs page if last-update occurred less than 30 days ago.
      if (doUpdate) {
        const p = Boolean(prefs.version);
        chrome.tabs.create({
          url: chrome.runtime.getManifest().homepage_url + '&version=' + version +
            '&type=' + (p ? ('upgrade&p=' + prefs.version) : 'install'),
          active: p === false
        });
      }
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL(
    chrome.runtime.getManifest().homepage_url + '&rd=feedback&name=' + name + '&version=' + version
  );
}
