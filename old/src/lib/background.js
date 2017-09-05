'use strict';

var app = app || require('./firefox/firefox');
var config = config || require('./config');

function checkState () {
  app.button.icon = config.js.state ? 'icons' : 'icons/n';
  app.button.label = 'JavaScript Toggle On and Off\n\n' +
    `JavaScript is "${config.js.state ? 'Enabled' : 'Disabled'}"`;
}

var blocker = (function () {
  let listener = function (details) {
    let headers = details.responseHeaders;
    headers.push({
      'name': 'Content-Security-Policy',
      'value': "script-src 'none'" // jshint ignore:line
    });
    return {
      responseHeaders: headers
    };
  };
  return {
    install: function () {
      app.webRequest.onHeadersReceived.addListener(listener,
        {
          'urls': new app.MatchPattern(['<all_urls>']),
          'types': [
            'main_frame',
            'sub_frame'
          ]
        },
        ['blocking', 'responseHeaders']
      );
      app.contentSettings.javascript.set({
        primaryPattern: '<all_urls>',
        setting: 'block'
      });
    },
    remove: function () {
      app.webRequest.onHeadersReceived.removeListener(listener);
      app.contentSettings.javascript.set({
        primaryPattern: '<all_urls>',
        setting: 'allow'
      });
    }
  };
})();
app.unload(blocker.remove);

app.button.onCommand(() => {
  config.js.state = !config.js.state;
  blocker[config.js.state ? 'remove' : 'install']();
  checkState();
});
blocker[config.js.state ? 'remove' : 'install']();
checkState();

//
app.contextMenus.create({
  title: 'Check JavaScript execution',
  contexts: ['browser_action'],
  onclick: () => app.tab.open('http://tools.add0n.com/check-javascript.html?rand=' + Math.random())
});

//
app.startup(function () {
  let version = config.welcome.version;
  if (app.version() !== version) {
    app.timers.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/javascript-toggler.html?v=' + app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
});
