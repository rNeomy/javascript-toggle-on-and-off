'use strict';

function restore() {
  chrome.storage.local.get({
    'whitelist': [],
    'blacklist': [],
    'refresh-enabled': true,
    'refresh-disabled': true,
    'badge': false
  }, prefs => {
    document.getElementById('whitelist').value = prefs.whitelist.join(', ');
    document.getElementById('blacklist').value = prefs.blacklist.join(', ');
    document.getElementById('refresh-enabled').checked = prefs['refresh-enabled'];
    document.getElementById('refresh-disabled').checked = prefs['refresh-disabled'];
    document.getElementById('badge').checked = prefs.badge;
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
    'badge': document.getElementById('badge').checked
  }, () => {
    restore();
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
    chrome.storage.local.get({
      'badge': false,
      'state': false
    }, prefs => chrome.browserAction.setBadgeText({
      text: prefs.badge && prefs.state === false ? 'd' : ''
    }));
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
