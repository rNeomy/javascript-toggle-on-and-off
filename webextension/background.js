'use strict';

var tab;

const notify = message => chrome.notifications.create({
  title: chrome.runtime.getManifest().name,
  type: 'basic',
  iconUrl: 'data/icons/48.png',
  message
});

const app = {
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

const js = {
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
    app.title(chrome.i18n.getMessage('bg_disable'));
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
    app.title(chrome.i18n.getMessage('bg_enable'));
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
{
  const onStartup = () => {
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
  };
  chrome.runtime.onInstalled.addListener(onStartup);
  chrome.runtime.onStartup.addListener(onStartup);
}

chrome.contextMenus.onClicked.addListener((info, t) => {
  if (info.menuItemId === 'open-test-page') {
    chrome.tabs.create({
      url: 'https://webbrowsertools.com/javascript/?rand=' + Math.random()
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
      notify(chrome.i18n.getMessage('bg_warning'));
    }
  }
});

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
