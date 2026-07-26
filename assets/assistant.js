/* lenexa-city-center-commons — the neighborhood assistant. Canon rules 15, 16, 17.

   Deterministic. On-device. No LLM, no API, no server, no query log.
   It reads the same public tile data and the same public notes anyone else can read,
   matches the question against them with fuzzy string + tag lookup, and answers.

   It never asks for a sign-in, never asks for a phone number, never up-sells, never
   argues with another platform, and never critiques the place you are standing in —
   it just tells you what else is nearby. Rule 15.

   Language: reads navigator.language on load. French if it starts with `fr`, English
   otherwise. Both strings are written out below in full; there is no translation call. */

(function (global) {
  'use strict';

  var LANG = ((global.navigator && navigator.language) || 'en').slice(0, 2) === 'fr' ? 'fr' : 'en';

  var S = {
    en: {
      placeholder: 'Ask about the neighborhood.',
      ask: 'Ask',
      mic: 'Speak your question',
      close: 'close',
      nothing: 'I could not find that in the tiles I can read. Try a place name, or a word like ' +
               'coffee, park, library, market, food, kids, quiet.',
      found1: 'One place matches.',
      foundN: function (n) { return n + ' places match.'; },
      weak: 'Nothing here is tagged for that yet, so this is a guess from names and addresses ' +
            'rather than from anything a neighbor wrote. If you know the answer, ' +
            '<a href="three-doors.html">write the note</a> and the next person will not have to guess.',
      readFrom: 'Read from the public tiles and notes in this repository. Nothing you typed was sent or stored.',
      noNotes: 'no notes yet — hopeful by default',
      note1: '1 note', noteN: function (n) { return n + ' notes'; },
      walkUnknown: 'walk time appears once you share location',
      helpHint: 'If you need help right now, the red <em>Reach help now</em> button is at the corner of every page.',
      emergencyAnswer: 'The red <strong>Reach help now</strong> button at the corner of this page opens ' +
               'Call 911, a pre-written text to someone you trust, and the Lenexa non-emergency line. ' +
               'This page never calls anyone for you — you tap the button on your own phone.',
      openTile: 'open'
    },
    fr: {
      placeholder: 'Posez une question sur le quartier.',
      ask: 'Demander',
      mic: 'Poser la question à voix haute',
      close: 'fermer',
      nothing: 'Je ne trouve pas cela dans les fiches que je peux lire. Essayez un nom de lieu, ou un mot ' +
               'comme café, parc, bibliothèque, marché, nourriture, enfants, calme.',
      found1: 'Un lieu correspond.',
      foundN: function (n) { return n + ' lieux correspondent.'; },
      weak: 'Rien ici n’est encore étiqueté pour cela : ceci est une supposition tirée des noms et ' +
            'des adresses, pas de ce qu’un voisin a écrit. Si vous connaissez la réponse, ' +
            '<a href="three-doors.html">écrivez la note</a> et la prochaine personne n’aura plus à deviner.',
      readFrom: 'Lu dans les fiches et les notes publiques de ce dépôt. Rien de ce que vous avez écrit n’a été envoyé ni conservé.',
      noNotes: 'pas encore de notes — plein d’espoir par défaut',
      note1: '1 note', noteN: function (n) { return n + ' notes'; },
      walkUnknown: 'le temps de marche apparaît si vous partagez votre position',
      helpHint: 'Si vous avez besoin d’aide maintenant, le bouton rouge <em>Reach help now</em> est au coin de chaque page.',
      emergencyAnswer: 'Le bouton rouge <strong>Reach help now</strong> au coin de cette page ouvre : appeler le 911, ' +
               'un message déjà écrit à une personne de confiance, et la ligne non urgente de Lenexa. ' +
               'Cette page n’appelle jamais personne à votre place — c’est vous qui appuyez.',
      openTile: 'ouvrir'
    }
  }[LANG];

  /* A small, arguable vocabulary. Arguing with it is a pull request. */
  var TOPICS = [
    { k: ['coffee', 'café', 'cafe', 'espresso', 'latte'], tags: ['coffee'], words: ['coffee', 'café', 'cafe'] },
    { k: ['food', 'eat', 'restaurant', 'dinner', 'lunch', 'manger', 'nourriture', 'restaurant', 'hungry', 'faim'],
      kinds: ['business'], words: ['kitchen', 'cuisine', 'pizza', 'noodle', 'barbecue', 'doner', 'bakery', 'taco', 'grill', 'market'] },
    { k: ['library', 'bibliothèque', 'book', 'livre', 'study', 'étudier'], words: ['library', 'bibliothèque'] },
    { k: ['park', 'parc', 'playground', 'skate', 'outside', 'dehors'], words: ['park', 'parc', 'skate', 'trail'] },
    { k: ['market', 'marché', 'farmers', 'produce'], words: ['market', 'marché'] },
    { k: ['kids', 'child', 'children', 'enfant', 'enfants', 'famille', 'family'], tags: ['safe-for-kids', 'family'],
      words: ['park', 'library', 'market', 'playground', 'rec', 'recreation'] },
    { k: ['rain', 'rainy', 'indoor', 'inside', 'pluie', 'intérieur'], words: ['library', 'market', 'hall', 'center', 'centre', 'museum'] },
    { k: ['quiet', 'calme', 'silence'], tags: ['quiet'] },
    { k: ['gym', 'fitness', 'swim', 'sport', 'exercise', 'health', 'santé'], tags: ['health'], words: ['life time', 'fitness', 'gym'] },
    { k: ['learn', 'class', 'school', 'university', 'apprendre', 'école', 'cours'], tags: ['learning'], words: ['university', 'library', 'park university'] },
    { k: ['volunteer', 'give', 'donate', 'donner', 'bénévole', 'help out'], tags: ['give-back'] },
    { k: ['third place', 'hang', 'sit', 'linger', 'rester', 'troisième lieu'], tags: ['third-place'] },
    { k: ['city hall', 'mairie', 'civic', 'government', 'permit'], kinds: ['civic'] },
    { k: ['apartment', 'apartments', 'live', 'housing', 'appartement', 'logement', 'rent'], kinds: ['residential'] },
    { k: ['open', 'hours', 'ouvert', 'heures'], hours: true }
  ];

  var EMERGENCY = ['help', 'emergency', 'danger', 'scared', 'urgence', 'aide', 'secours', 'peur', '911', 'police'];

  var api = null, els = {}, shown = {};   // shown: never suggest the same tile twice per session

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fold(s) {
    return String(s || '').toLowerCase()
      .normalize ? String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                 : String(s || '').toLowerCase();
  }

  /* Words that carry no place-meaning. Without this list "where can I take my kids ON a
     rainy afternoon" matches Ross CanyON, which is exactly the kind of confident nonsense
     this assistant is not allowed to produce. */
  var STOP = ('a an and any are as at be been but by can do does for from get go going had has have '
    + 'here how i if in into is it its just me my near of on or our out over should so some take that '
    + 'the their there these they this to up us was we what when where which who why will with would you '
    + 'your au aux avec ce ces dans de des du elle en est et eu il je la le les leur lui ma mais me meme '
    + 'mes moi mon ne nos notre nous on ou par pas pour que qui sa se ses son sur ta te tes toi ton tu un '
    + 'une vos votre vous y a-t-il ou est').split(' ').reduce(function (m, w) { m[w] = 1; return m; }, {});

  function tokens(q) {
    return fold(q).replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/)
      .filter(function (t) { return t.length > 1 && !STOP[t]; });
  }

  /* cheap similarity: shared prefix / substring containment. deterministic, no deps.
     Short tokens must land on a word boundary — "art" should not match "Departure". */
  function fuzzy(needle, hay) {
    if (!needle || !hay) return 0;
    if (needle.length <= 3) {
      return new RegExp('(^|[^a-z0-9])' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(hay) ? 1 : 0;
    }
    if (hay.indexOf(needle) >= 0) return 1;
    if (hay.indexOf(needle.slice(0, needle.length - 1)) >= 0) return 0.7;
    return 0;
  }

  function scoreTile(tile, toks, raw) {
    var name = fold(tile.name), addr = fold(tile.address), blurb = fold(tile.blurb || '');
    var notes = (api.notes(tile.id) || []);
    var tagset = {};
    notes.forEach(function (n) { (n.tags || []).forEach(function (t) { tagset[fold(t)] = 1; }); });
    var score = 0, why = [];

    toks.forEach(function (t) {
      if (fuzzy(t, name)) { score += 6; why.push('name'); }
      else if (fuzzy(t, blurb)) { score += 2; }
      else if (fuzzy(t, addr)) { score += 1.5; }
      if (tagset[t]) { score += 3; why.push('tag:' + t); }
      notes.forEach(function (n) { if (fold(n.text).indexOf(t) >= 0) { score += 1.5; why.push('note'); } });
    });

    TOPICS.forEach(function (topic) {
      var hit = topic.k.some(function (kw) { return fold(raw).indexOf(fold(kw)) >= 0; });
      if (!hit) return;
      (topic.words || []).forEach(function (w) { if (name.indexOf(fold(w)) >= 0 || blurb.indexOf(fold(w)) >= 0) { score += 4; why.push('topic'); } });
      (topic.tags || []).forEach(function (tg) { if (tagset[tg]) { score += 4; why.push('tag:' + tg); } });
      (topic.kinds || []).forEach(function (kd) { if (tile.kind === kd) { score += 1.5; why.push('kind'); } });
    });

    return { tile: tile, score: score, why: why, notes: notes };
  }

  function answer(raw) {
    var toks = tokens(raw);
    if (!toks.length) return null;

    if (EMERGENCY.some(function (w) { return toks.indexOf(w) >= 0; })) {
      return { html: '<p>' + S.emergencyAnswer + '</p>', src: null, emergency: true };
    }

    var results = api.tiles()
      .map(function (t) { return scoreTile(t, toks, raw); })
      .filter(function (r) { return r.score > 2; })
      .sort(function (a, b) {
        // proximity breaks ties, never rank; canon rule 4 forbids ranking places against each other
        var wa = api.walkMinutes(a.tile), wb = api.walkMinutes(b.tile);
        if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
        if (wa == null && wb == null) return 0;
        if (wa == null) return 1;
        if (wb == null) return -1;
        return wa - wb;
      });

    // rule 16: never push the same place twice in one visit
    var fresh = results.filter(function (r) { return !shown[r.tile.id]; });
    if (!fresh.length && results.length) fresh = results;   // still answer, just be honest
    fresh = fresh.slice(0, 5);
    if (!fresh.length) return { html: '<p>' + S.nothing + '</p>', src: null };

    fresh.forEach(function (r) { shown[r.tile.id] = 1; });

    // Honesty about confidence. A guess that announces itself is worth more than a
    // confident-sounding list, and it tells the visitor what note is missing.
    var weak = fresh[0].score < 6;
    var h = '';
    if (weak) h += '<p class="weak">' + S.weak + '</p>';
    h += '<p>' + (fresh.length === 1 ? S.found1 : S.foundN(fresh.length)) + '</p><ul>';
    fresh.forEach(function (r) {
      var w = api.walkText(r.tile);
      var n = r.notes.length;
      h += '<li><a data-tile="' + esc(r.tile.id) + '"><strong>' + esc(r.tile.name) + '</strong></a> — ' +
           (w ? esc(w) : S.walkUnknown) + ' · ' +
           (n ? (n === 1 ? S.note1 : S.noteN(n)) : S.noNotes) + '</li>';
    });
    h += '</ul>';
    return { html: h, src: S.readFrom };
  }

  function render(res) {
    if (!els.answer) return;
    els.answer.hidden = false;
    els.answer.innerHTML =
      '<button type="button" class="answer-close" id="answer-close">' + S.close + '</button>' +
      res.html + (res.src ? '<p class="src">' + res.src + '</p>' : '');
    document.getElementById('answer-close').addEventListener('click', function () {
      els.answer.hidden = true;
    });
    Array.prototype.forEach.call(els.answer.querySelectorAll('[data-tile]'), function (a) {
      a.addEventListener('click', function () { api.open(a.getAttribute('data-tile')); });
    });
  }

  function submit() {
    var q = els.input.value.trim();
    if (!q) return;
    var res = answer(q);
    if (res) render(res);
  }

  function mountMic() {
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR || !els.mic) { if (els.mic) els.mic.hidden = true; return; }
    var r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = (global.navigator && navigator.language) || 'en-US';
    els.mic.addEventListener('click', function () {
      try { r.start(); els.mic.classList.add('is-live'); } catch (e) {}
    });
    r.onresult = function (e) {
      els.input.value = e.results[0][0].transcript;     // stays in the input, nowhere else
      els.mic.classList.remove('is-live');
      submit();
    };
    r.onerror = r.onend = function () { els.mic.classList.remove('is-live'); };
  }

  function mount(host, answerHost, provider) {
    api = provider;
    host.innerHTML =
      '<form class="ask" id="ask-form" autocomplete="off">' +
      '<input id="ask-input" type="text" placeholder="' + esc(S.placeholder) + '" ' +
      'aria-label="' + esc(S.placeholder) + '" enterkeyhint="search">' +
      '<button type="button" id="ask-mic" title="' + esc(S.mic) + '" aria-label="' + esc(S.mic) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg></button>' +
      '<button type="submit" title="' + esc(S.ask) + '" aria-label="' + esc(S.ask) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>' +
      '</form>';
    els.input = document.getElementById('ask-input');
    els.mic = document.getElementById('ask-mic');
    els.answer = answerHost;
    document.getElementById('ask-form').addEventListener('submit', function (e) {
      e.preventDefault(); submit();
    });
    mountMic();
  }

  global.CommonsAssistant = { mount: mount, lang: LANG, answer: answer };
})(window);
