'use strict';

/**** wrapper (start) ****/
if (typeof require !== 'undefined') {
  var app = require('./firefox/firefox');
  var config = require('./config');
}
/**** wrapper (end) ****/

function checkState () {
  app.button.icon = config.js.state ? 'icons' : 'icons/n';
  app.button.label = `JavaScript Toggle On and Off (${config.js.state})`;
}

var blocker = (function () {
  let listener = function (details) {
    let headers = details.responseHeaders;
    headers.push({
      'name': 'Content-Security-Policy',
      'value': 'script-src "none"'
    });

    return {
      responseHeaders: headers
    };
  };
  return {
    install: function () {
      app.webRequest.onHeadersReceived.addListener(listener,
        {
          'urls': new app.MatchPattern([
            'http://*/*',
            'https://*/*'
          ]),
          'types': [
            'main_frame',
            'sub_frame'
          ]
        },
        ['blocking', 'responseHeaders']
      );
    },
    remove: function () {
      app.webRequest.onHeadersReceived.removeListener(listener);
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
app.startup(function () {
  let version = config.welcome.version;
  if (app.version() !== version) {
    app.timers.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/javascript-toggle.html?v=' + app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
});
