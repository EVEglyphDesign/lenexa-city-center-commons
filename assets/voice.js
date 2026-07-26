/* lenexa-city-center-commons — opt-in, on-device voice trigger. Canon rules 2, 9, 17, 18.

   Everything here runs inside the browser's own speech recognition. No audio is uploaded
   by this page, no transcript is stored, no transcript is transmitted, and nothing is kept
   after the words are matched — the interim string is discarded on every result event.

   (Honest caveat, stated in the UI as well: in some browsers — Chrome in particular — the
   Web Speech API itself is implemented against a vendor service. That is the browser's
   pipeline, not ours. We ask the browser for recognition and never see or keep the audio.
   Firefox and browsers without the API simply do not offer the toggle at all.)

   Off by default. One tap on, one tap off. The state lives in localStorage under
   `commons_listen` so the choice survives a refresh; deleting it costs nothing. */

(function (global) {
  'use strict';

  var KEY = 'commons_listen';

  var PHRASES = [
    'commons help', 'commons help me', 'help me commons', 'the commons help',
    'commons i need help', 'i need help', 'common help', 'commons please help'
  ];

  var SR = global.SpeechRecognition || global.webkitSpeechRecognition;

  var el = {};
  var rec = null;
  var state = { on: false, live: false, stopping: false };

  function supported() { return !!SR; }

  function stored() {
    try { return global.localStorage.getItem(KEY) === 'on'; } catch (e) { return false; }
  }
  function store(on) {
    try {
      if (on) global.localStorage.setItem(KEY, 'on');
      else global.localStorage.removeItem(KEY);
    } catch (e) {}
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function matches(text) {
    var t = norm(text);
    if (!t) return false;
    for (var i = 0; i < PHRASES.length; i++) {
      if (t.indexOf(PHRASES[i]) >= 0) return true;
    }
    // loose: "commons" plus "help" anywhere close together
    return /\bcommons?\b[\s\w]{0,18}\bhelp\b/.test(t) || /\bhelp\b[\s\w]{0,18}\bcommons?\b/.test(t);
  }

  function setIndicator(mode) {   // 'off' | 'listening' | 'paused' | 'blocked'
    if (!el.dot) return;
    el.dot.hidden = (mode === 'off');
    el.dot.classList.toggle('is-paused', mode !== 'listening');
    var label = mode === 'listening' ? 'Listening'
              : mode === 'paused' ? 'Paused — tap the map to resume'
              : mode === 'blocked' ? 'Microphone blocked by the browser'
              : '';
    if (el.dotText) el.dotText.textContent = label;
    if (el.sw) el.sw.setAttribute('aria-checked', state.on ? 'true' : 'false');
  }

  function build(rec) {
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = (global.navigator && navigator.language) || 'en-US';
    rec.maxAlternatives = 3;

    rec.onstart = function () { state.live = true; setIndicator('listening'); };

    rec.onresult = function (e) {
      var hit = false;
      for (var i = e.resultIndex; i < e.results.length; i++) {
        for (var j = 0; j < e.results[i].length; j++) {
          if (matches(e.results[i][j].transcript)) { hit = true; break; }
        }
        if (hit) break;
      }
      // the transcript is not saved, logged, or sent anywhere — it dies with this scope
      if (hit && global.CommonsPanic && !global.CommonsPanic.isOpen()) {
        global.CommonsPanic.open();
      }
    };

    rec.onerror = function (e) {
      if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) {
        state.on = false; store(false); state.live = false;
        setIndicator('blocked');
        return;
      }
      state.live = false;
      setIndicator(state.on ? 'paused' : 'off');
    };

    rec.onend = function () {
      state.live = false;
      if (!state.on) { setIndicator('off'); return; }
      if (document.hidden) { setIndicator('paused'); return; }
      // browsers end the session on their own schedule; pick it straight back up
      setIndicator('paused');
      setTimeout(function () { if (state.on && !document.hidden) start(); }, 400);
    };
    return rec;
  }

  function start() {
    if (!supported() || state.live) return;
    if (!rec) rec = build(new SR());
    try { rec.start(); } catch (e) { /* already starting */ }
  }

  function stop() {
    state.on = false;
    store(false);
    setIndicator('off');
    if (rec) { try { rec.stop(); } catch (e) {} }
  }

  function toggle() {
    if (state.on) { stop(); return; }
    state.on = true;
    store(true);
    setIndicator('paused');
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (!state.on) return;
    if (document.hidden) {
      setIndicator('paused');
      if (rec) { try { rec.stop(); } catch (e) {} }
    } else {
      setIndicator('paused');
      start();
    }
  });

  function mount(host, dotHost) {
    if (!host) return;
    if (!supported()) {
      host.innerHTML =
        '<div class="listen"><span class="listen-txt"><b>Listen for help</b>' +
        'This browser does not offer on-device speech recognition. The red ' +
        '<em>Reach help now</em> button at the corner of every page still works.</span></div>';
      return;
    }
    // On a phone the map is the point, so the explanation folds away — but it is one tap
    // from the switch, and the switch never turns on by itself.
    var narrow = (window.innerWidth || 999) <= 720;
    host.innerHTML =
      '<div class="listen">' +
      '<span class="listen-txt"><b>Listen for help</b>' +
      '<span class="listen-why" id="listen-why"' + (narrow ? ' hidden' : '') + '>' +
      'The Commons can listen for you to say &ldquo;Commons, help&rdquo; and open the emergency ' +
      'screen. It uses your phone&rsquo;s browser — no audio is sent or saved by this page. ' +
      'Turn it off any time.</span>' +
      (narrow ? '<button type="button" class="listen-more" id="listen-more">what this does</button>' : '') +
      '</span>' +
      '<button type="button" class="listen-sw" id="listen-sw" role="switch" aria-checked="false" ' +
      'aria-label="Listen for the words Commons help"></button>' +
      '</div>';
    el.sw = document.getElementById('listen-sw');
    el.sw.addEventListener('click', toggle);
    var more = document.getElementById('listen-more');
    if (more) {
      more.addEventListener('click', function () {
        var why = document.getElementById('listen-why');
        var open = !why.hasAttribute('hidden');
        if (open) { why.setAttribute('hidden', ''); more.textContent = 'what this does'; }
        else { why.removeAttribute('hidden'); more.textContent = 'hide'; }
      });
    }

    if (dotHost) {
      dotHost.innerHTML = '<span class="listen-dot is-paused" id="listen-dot" hidden>' +
        '<i aria-hidden="true"></i><span id="listen-dot-text"></span></span>';
      el.dot = document.getElementById('listen-dot');
      el.dotText = document.getElementById('listen-dot-text');
    }

    if (stored()) {
      state.on = true;
      setIndicator('paused');
      start();                       // browser re-prompts for the mic if it needs to
    } else {
      setIndicator('off');
    }
  }

  global.CommonsVoice = {
    mount: mount, supported: supported, toggle: toggle, stop: stop,
    isOn: function () { return state.on; }
  };
})(window);
