'use strict';

// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e.textContent = chrome.i18n.getMessage(e.dataset.i18n);
});

const toast = document.getElementById('toast');

function restore() {
  chrome.storage.local.get({
    'whitelist': [],
    'blacklist': [],
    'refresh-enabled': true,
    'refresh-disabled': true,
    'badge-color': '#da4537'
  }, prefs => {
    document.getElementById('whitelist').value = prefs.whitelist.join(', ');
    document.getElementById('blacklist').value = prefs.blacklist.join(', ');
    document.getElementById('refresh-enabled').checked = prefs['refresh-enabled'];
    document.getElementById('refresh-disabled').checked = prefs['refresh-disabled'];
    document.getElementById('badge-color').value = prefs['badge-color'];
  });
}
function save() {
  let whitelist = document.getElementById('whitelist').value;
  whitelist = whitelist.split(/\s*,\s*/).map(s => {
    return s.replace('http://', '').replace('https://', '').split('/')[0].trim();
  }).filter((h, i, l) => h && l.indexOf(h) === i);

  let blacklist = document.getElementById('blacklist').value;
  blacklist = blacklist.split(/\s*,\s*/).map(s => {
    return s.replace('http://', '').replace('https://', '').split('/')[0].trim();
  }).filter((h, i, l) => h && l.indexOf(h) === i);

  chrome.storage.local.set({
    whitelist,
    blacklist,
    'refresh-enabled': document.getElementById('refresh-enabled').checked,
    'refresh-disabled': document.getElementById('refresh-disabled').checked,
    'badge-color': document.getElementById('badge-color').value
  }, () => {
    restore();
    toast.textContent = 'Options saved.';
    setTimeout(() => toast.textContent = '', 750);
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
// incognito
document.getElementById('private').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '#faq3'
}));
// Links
const links = window.links = (d = document) => {
  for (const a of [...d.querySelectorAll('[data-href]')]) {
    if (a.hasAttribute('href') === false) {
      a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
    }
  }
};
document.addEventListener('DOMContentLoaded', () => links());
