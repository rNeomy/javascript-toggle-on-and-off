'use strict';

function restore() {
  chrome.storage.local.get({
    'whitelist': [],
    'blacklist': [],
    'refresh-enabled': true,
    'refresh-disabled': true
  }, prefs => {
    document.getElementById('whitelist').value = prefs.whitelist.join(', ');
    document.getElementById('blacklist').value = prefs.blacklist.join(', ');
    document.getElementById('refresh-enabled').checked = prefs['refresh-enabled'];
    document.getElementById('refresh-disabled').checked = prefs['refresh-disabled'];
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
    'refresh-disabled': document.getElementById('refresh-disabled').checked
  }, () => {
    restore();
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
