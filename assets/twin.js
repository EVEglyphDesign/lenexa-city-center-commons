/* lenexa-city-center-commons — optional local-first twin.
   Canon rules 9, 11, 14.

   The twin is a single JSON object in this browser's localStorage. It is created only
   if the visitor asks for it. It never leaves the device unless the visitor exports it.
   There is no account, no sync, no server. Deleting it costs nothing and leaves nothing
   behind — that is rule 11, no leaving cost.

   Shape:
   {
     "format": "commons-twin/1",
     "created": "2026-07-25",
     "lenses": ["safe-for-kids"],
     "favorites": ["lenexa-public-market"],
     "trusted_contact": "+19135550123",
     "language": "en"
   }

   There is no owner, landlord, or management field here either. Rule 4. */

(function (global) {
  'use strict';

  var KEY = 'commons_twin';
  var FORMAT = 'commons-twin/1';
  var ALLOWED = ['format', 'created', 'lenses', 'favorites', 'trusted_contact', 'language'];

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function read() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(KEY);
      if (!raw) return null;
      var t = safeParse(raw);
      return t && typeof t === 'object' ? t : null;
    } catch (e) { return null; }   // private mode, storage disabled — fine, no twin
  }

  function write(twin) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(twin));
      emit();
      return true;
    } catch (e) { return false; }
  }

  function blank() {
    return {
      format: FORMAT,
      created: new Date().toISOString().slice(0, 10),
      lenses: [],
      favorites: [],
      trusted_contact: '',
      language: (global.navigator && global.navigator.language || 'en').slice(0, 2)
    };
  }

  function create() {
    var t = read();
    if (t) return t;
    t = blank();
    write(t);
    return t;
  }

  function exists() { return !!read(); }

  function get(field, fallback) {
    var t = read();
    if (!t || !(field in t)) return fallback;
    return t[field];
  }

  /* set() only writes if a twin already exists. Nothing is stored behind the
     visitor's back — a preference silently creating storage would break rule 14. */
  function set(field, value) {
    if (ALLOWED.indexOf(field) < 0) return false;
    var t = read();
    if (!t) return false;
    t[field] = value;
    return write(t);
  }

  function remove() {
    try { global.localStorage.removeItem(KEY); } catch (e) {}
    emit();
    return true;
  }

  function sanitize(obj) {
    if (!obj || typeof obj !== 'object') return null;
    var t = blank();
    ALLOWED.forEach(function (k) { if (k in obj) t[k] = obj[k]; });
    t.format = FORMAT;
    if (!Array.isArray(t.lenses)) t.lenses = [];
    if (!Array.isArray(t.favorites)) t.favorites = [];
    if (typeof t.trusted_contact !== 'string') t.trusted_contact = '';
    if (typeof t.language !== 'string') t.language = 'en';
    return t;
  }

  function importJSON(text) {
    var t = sanitize(safeParse(text));
    if (!t) return false;
    return write(t);
  }

  function exportFile() {
    var t = read();
    if (!t) return false;
    var blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'commons-twin.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return true;
  }

  var listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (fn) { try { fn(read()); } catch (e) {} }); }

  global.CommonsTwin = {
    KEY: KEY, FORMAT: FORMAT,
    read: read, create: create, exists: exists,
    get: get, set: set, remove: remove,
    importJSON: importJSON, exportFile: exportFile,
    onChange: onChange
  };
})(window);
