'use strict';

var config = typeof require === 'undefined' ? {} : exports;
var app = app || require('./firefox/firefox');

config.js = {
  get state () {
    let state = app.storage.read('state');
    return (state === undefined) ? true : state;
  },
  set state (val) {
    app.storage.write('state', val);
  }
};

config.welcome = {
  get version () {
    return app.storage.read('version');
  },
  set version (val) {
    app.storage.write('version', val);
  },
  timeout: 3,
  get show () {
    let state = app.storage.read('show');
    return (state === undefined) ? true : state;
  },
  set show (val) {
    app.storage.write('show', val);
  }
};
