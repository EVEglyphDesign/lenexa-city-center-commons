/* lenexa-city-center-commons — map surface.
   Everything here runs in the visitor's browser. Nothing is transmitted from this page.
   No accounts, no cookies, no analytics, no server. The only storage is the optional
   twin the visitor asks for by name (assets/twin.js). Canon rules 2, 9, 13, 14, 16. */

(function () {
  'use strict';

  var REPO = 'EVEglyphDesign/lenexa-city-center-commons';
  var ISSUE_BASE = 'https://github.com/' + REPO + '/issues/new';
  var WINDOW_DAYS = 365; // rolling window for mood
  var WALK_M_PER_MIN = 84;   // ~5 km/h
  var WALK_FUDGE = 1.3;      // straight line is a lie; sidewalks bend
  var HERE_RADIUS_M = 250;

  /* ---------------------------------------------------------------------
     Tag vocabulary. Deliberately small, gentle, and readable.
     Argue with it in a pull request — that is the point of it living here.
     Nothing in this table ranks one tile against another; it only chooses
     how a single tile is drawn.
  --------------------------------------------------------------------- */
  var TAG_TONE = {
    warm: [
      'warm', 'friendly', 'kind', 'lovely', 'great', 'good', 'delicious', 'welcoming',
      'clean', 'quiet', 'safe', 'fixed', 'improved', 'helpful', 'busy', 'lively',
      'family', 'accessible', 'good-lighting', 'well-lit', 'thanks', 'favorite'
    ],
    friction: [
      'noise', 'noisy', 'broken', 'leak', 'mold', 'pests', 'unlit', 'dark',
      'flooding', 'trash', 'unresponsive', 'waiting', 'slow-repair', 'crowded-parking',
      'unsafe-crossing', 'closed', 'hot', 'cold', 'heat', 'ac', 'water'
    ]
  };

  var MOODS = {
    hopeful:   { color: '#f0d9a8', fill: '#fdf3dd', label: 'hopeful',   opacity: 0.75,
                 blurb: 'No notes yet — light, unfinished, waiting. Absence of data is not a signal.' },
    warm:      { color: '#d98b52', fill: '#f7e0cd', label: 'warm',      opacity: 1,
                 blurb: 'Notes here lean warm.' },
    neutral:   { color: '#7f9a8b', fill: '#e2ebe4', label: 'neutral',   opacity: 1,
                 blurb: 'Notes here are mixed or untagged.' },
    weathered: { color: '#9d9481', fill: '#ece7dc', label: 'weathered', opacity: 0.95,
                 blurb: 'Recurring friction shows up in the notes. Illustrative, not a verdict.' },
    dim:       { color: '#8c8f9b', fill: '#e5e6ec', label: 'dim',       opacity: 0.95,
                 blurb: 'Sustained friction across the window. Still just notes, still not a ranking.' }
  };

  var ICONS = {
    residential: '<path d="M2 8.5 8 3l6 5.5" /><path d="M3.6 8v5.2h8.8V8" /><path d="M6.6 13.2V10h2.8v3.2" />',
    business:    '<path d="M2.4 6.2 3.6 3h8.8l1.2 3.2" /><path d="M2.4 6.2h11.2v1a2 2 0 0 1-4 0 2 2 0 0 1-3.2 0 2 2 0 0 1-4 0z" /><path d="M3.6 8.6v4.6h8.8V8.6" />',
    civic:       '<path d="M8 2.6c2 1.7 3 3.3 3 5a3 3 0 0 1-6 0c0-1.7 1-3.3 3-5z" /><path d="M8 10.6v3" /><path d="M5.6 13.6h4.8" />'
  };

  var DOORS = [
    { id: 'neighbor', template: 'neighbor-note.yml', name: 'Neighbor',
      desc: 'Anyone who lives, works, or spends time here. Any tone, any tag.' },
    { id: 'business-owner', template: 'business-owner-response.yml', name: 'Business owner',
      desc: 'Respond, add context, share news. Same weight as any other note.' },
    { id: 'institutional-observer', template: 'institutional-observer.yml', name: 'Institutional observer',
      desc: 'Add public, citable context. This surface points to intake channels — it never files anything.' }
  ];

  /* Lenses. Empty until notes carry these tags — that is the hopeful floor, not a bug. */
  var LENSES = [
    { id: 'all', label: 'All', tag: null },
    { id: 'safe-for-kids', label: 'Safe for kids', tag: 'safe-for-kids' },
    { id: 'give-back', label: 'Give back', tag: 'give-back' },
    { id: 'health', label: 'Health', tag: 'health' },
    { id: 'learning', label: 'Learning', tag: 'learning' },
    { id: 'third-place', label: 'Third places', tag: 'third-place' }
  ];

  var els = {
    drawer: document.getElementById('drawer'),
    title: document.getElementById('drawer-title'),
    addr: document.getElementById('drawer-addr'),
    body: document.getElementById('drawer-body'),
    close: document.getElementById('drawer-close'),
    count: document.getElementById('tile-count'),
    introToggle: document.getElementById('intro-toggle'),
    introBody: document.getElementById('intro-body'),
    ask: document.getElementById('deck-ask'),
    answer: document.getElementById('deck-answer'),
    lenses: document.getElementById('deck-lenses'),
    listen: document.getElementById('deck-listen'),
    dot: document.getElementById('deck-dot'),
    twinPanel: document.getElementById('twin-panel'),
    twinBtn: document.getElementById('twin-btn')
  };

  var state = {
    tiles: [], notes: {}, markers: {}, active: null, geofence: null,
    here: null,              // {lat, lon} — on-device only, never stored, never sent
    lens: 'all', hereLayer: null
  };

  // keep the map exactly as tall as the space under the header, on any device
  function sizeShell() {
    var shell = document.querySelector('.shell');
    var head = document.querySelector('.topbar');
    if (!shell || !head) return;
    var vh = (window.visualViewport && window.visualViewport.height) ||
             document.documentElement.clientHeight || window.innerHeight;
    shell.style.height = Math.max(360, vh - head.offsetHeight) + 'px';
  }
  sizeShell();
  window.addEventListener('resize', function () { sizeShell(); if (window.__lccMap) window.__lccMap.invalidateSize(); });

  /* ---------------- map ---------------- */

  var map = L.map('map', {
    center: [38.9700, -94.7800],
    zoom: 15,
    minZoom: 13,
    maxZoom: 18,
    zoomControl: false,
    attributionControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a> &middot; ' +
      'a neighborhood, not a campaign'
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  window.__lccMap = map;

  /* ---------------- helpers ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function parseNotes(md) {
    // strip html comments (the seeded template block lives in one)
    var text = md.replace(/<!--[\s\S]*?-->/g, '');
    var idx = text.indexOf('## Notes');
    if (idx >= 0) text = text.slice(idx + 8);
    var blocks = text.split(/^###\s+/m).slice(1);
    return blocks.map(function (block) {
      var lines = block.split('\n');
      var head = lines.shift().trim();
      var date = (head.match(/\d{4}-\d{2}-\d{2}/) || [''])[0];
      var door = (head.match(/door:\s*([a-z-]+)/i) || [null, ''])[1];
      var tags = [];
      var body = [];
      lines.forEach(function (line) {
        var m = line.match(/^\s*tags:\s*(.*)$/i);
        if (m) {
          tags = m[1].split(',').map(function (t) { return t.trim().toLowerCase(); })
                     .filter(Boolean);
        } else if (line.trim()) {
          body.push(line.trim());
        }
      });
      return { date: date, door: door, tags: tags, text: body.join('\n') };
    }).filter(function (n) { return n.text || n.tags.length; });
  }

  function withinWindow(note) {
    if (!note.date) return true;
    var t = Date.parse(note.date);
    if (isNaN(t)) return true;
    return (Date.now() - t) <= WINDOW_DAYS * 86400000;
  }

  // Mood is computed here, client-side, every load. Nothing is stored anywhere.
  function moodFor(notes) {
    var recent = notes.filter(withinWindow);
    if (!recent.length) return 'hopeful';           // canon rule 8 — the floor
    var warm = 0, friction = 0;
    recent.forEach(function (n) {
      n.tags.forEach(function (tag) {
        if (TAG_TONE.warm.indexOf(tag) >= 0) warm++;
        else if (TAG_TONE.friction.indexOf(tag) >= 0) friction++;
      });
    });
    if (!warm && !friction) return 'neutral';
    if (friction === 0) return 'warm';
    if (warm === 0 && friction >= 3) return 'dim';
    if (friction > warm) return 'weathered';
    if (warm > friction * 2) return 'warm';
    return 'neutral';
  }

  function tagsOf(tile) {
    var out = (tile.tags || []).slice();
    (state.notes[tile.id] || []).forEach(function (n) {
      (n.tags || []).forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); });
    });
    return out;
  }

  function pinIcon(kind, mood, active, dim) {
    var m = MOODS[mood];
    var glyph = ICONS[kind] || ICONS.civic;
    var html =
      '<div class="pin-body" style="background:' + m.fill + ';border-color:' + m.color +
      ';opacity:' + m.opacity + '">' +
      '<svg viewBox="0 0 16 16" fill="none" stroke="' + m.color +
      '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + glyph + '</svg></div>';
    return L.divIcon({
      className: 'tile-pin mood-' + mood + (active ? ' is-active' : '') + (dim ? ' dim-tile' : ''),
      html: html,
      iconSize: [30, 30],
      iconAnchor: [15, 26]
    });
  }

  function issueURL(door, tile) {
    return ISSUE_BASE + '?template=' + encodeURIComponent(door.template) +
      '&labels=' + encodeURIComponent('note,door:' + door.id) +
      '&title=' + encodeURIComponent('[note] ' + tile.name) +
      '&tile=' + encodeURIComponent(tile.id);
  }

  /* ---------------- here mode (canon rule 13) ----------------
     Location is read on-device, held in a local variable, and never stored or sent. */

  function metres(aLat, aLon, bLat, bLon) {
    var dy = (bLat - aLat) * 111320;
    var dx = (bLon - aLon) * 111320 * Math.cos(aLat * Math.PI / 180);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function bearing(aLat, aLon, bLat, bLon) {
    var dy = (bLat - aLat);
    var dx = (bLon - aLon) * Math.cos(aLat * Math.PI / 180);
    var deg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
  }

  function walkMinutes(tile) {
    if (!state.here) return null;
    var d = metres(state.here.lat, state.here.lon, tile.lat, tile.lon) * WALK_FUDGE;
    return Math.max(1, Math.round(d / WALK_M_PER_MIN));
  }

  function walkText(tile) {
    var m = walkMinutes(tile);
    if (m == null) return null;
    return m + ' min ' + bearing(state.here.lat, state.here.lon, tile.lat, tile.lon);
  }

  function isNear(tile) {
    if (!state.here) return true;
    return metres(state.here.lat, state.here.lon, tile.lat, tile.lon) <= HERE_RADIUS_M * 4;
  }

  function setHere(lat, lon) {
    state.here = { lat: lat, lon: lon };
    if (state.hereLayer) map.removeLayer(state.hereLayer);
    state.hereLayer = L.circleMarker([lat, lon], {
      radius: 7, color: '#4e6b4c', weight: 2, fillColor: '#a9c9a1', fillOpacity: .9
    }).addTo(map).bindTooltip('You are here — this stays in your browser', { direction: 'top' });
    map.setView([lat, lon], 17);
    refreshPins();
    if (state.active) {
      var t = byId(state.active);
      if (t) openTile(t, true);
    }
  }

  function askHere() {
    if (!navigator.geolocation) return;
    var go = function () {
      navigator.geolocation.getCurrentPosition(
        function (p) { setHere(p.coords.latitude, p.coords.longitude); },
        function () { /* denied — City Center centroid stays. No nagging. Rule 13. */ },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    };
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(function (st) {
        if (st.state !== 'denied') go();
      }).catch(go);
    } else { go(); }
  }

  /* ---------------- lenses ---------------- */

  function lensTag() {
    var l = LENSES.filter(function (x) { return x.id === state.lens; })[0];
    return l ? l.tag : null;
  }

  function passesLens(tile) {
    var tag = lensTag();
    if (!tag) return true;
    return tagsOf(tile).indexOf(tag) >= 0;
  }

  function refreshPins() {
    state.tiles.forEach(function (t) {
      var mk = state.markers[t.id];
      if (!mk) return;
      var pass = passesLens(t);
      if (!pass) {
        if (map.hasLayer(mk)) map.removeLayer(mk);
        return;
      }
      if (!map.hasLayer(mk)) mk.addTo(map);
      mk.setIcon(pinIcon(t.kind, moodFor(state.notes[t.id] || []), state.active === t.id, !isNear(t)));
    });
    renderLenses();
  }

  function renderLenses() {
    if (!els.lenses) return;
    els.lenses.innerHTML = LENSES.map(function (l) {
      var n = l.tag == null ? state.tiles.length
        : state.tiles.filter(function (t) { return tagsOf(t).indexOf(l.tag) >= 0; }).length;
      return '<button type="button" class="lens' + (n === 0 ? ' empty' : '') +
        '" data-lens="' + l.id + '" aria-pressed="' +
        (state.lens === l.id ? 'true' : 'false') + '"' +
        (n === 0 ? ' title="No note carries this tag yet."' : '') + '>' + esc(l.label) +
        ' <span class="n">' + n + '</span></button>';
    }).join('') +
      '<p class="lens-note">Lenses count notes, not guesses. A zero means nobody has ' +
      'written it yet.</p>';
    Array.prototype.forEach.call(els.lenses.querySelectorAll('[data-lens]'), function (b) {
      b.addEventListener('click', function () {
        state.lens = b.getAttribute('data-lens');
        try {
          if (window.CommonsTwin && CommonsTwin.exists()) CommonsTwin.set('lenses', [state.lens]);
        } catch (e) {}
        refreshPins();
      });
    });
  }

  /* ---------------- deep-link back-out (canon rule 12) ----------------
     Every external field carries the button that takes the visitor back to the platform
     it came from. The Commons never captures the click and never argues with the place
     the visitor is going. */

  var ARROW = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M5 2h7v7"/><path d="M12 2 6 8"/>' +
    '<path d="M10 9v3H2V4h3"/></svg>';

  function q(s) { return encodeURIComponent(s); }

  function backouts(tile) {
    var ext = tile.external || {};
    var here = tile.name + ' ' + (tile.address || 'Lenexa, KS');
    var list = [];

    list.push({
      k: 'Google Maps',
      label: ext.google_place_id ? 'Leave a Google review' : 'Find it on Google Maps',
      href: ext.google_place_id
        ? 'https://search.google.com/local/writereview?placeid=' + q(ext.google_place_id)
        : 'https://www.google.com/maps/search/?api=1&query=' + q(here)
    });
    list.push({
      k: 'Yelp',
      label: ext.yelp_url ? 'See on Yelp' : 'Search Yelp',
      href: ext.yelp_url || ('https://www.yelp.com/search?find_desc=' + q(tile.name) +
            '&find_loc=' + q('Lenexa, KS'))
    });
    list.push({
      k: 'Nextdoor',
      label: 'Post on Nextdoor',
      href: 'https://nextdoor.com/create_post/'
    });
    list.push({
      k: 'OpenStreetMap',
      label: 'See on OpenStreetMap',
      href: 'https://www.openstreetmap.org/?mlat=' + tile.lat + '&mlon=' + tile.lon +
            '#map=18/' + tile.lat + '/' + tile.lon
    });
    list.push({
      k: 'BBB',
      label: 'Look up on BBB',
      href: 'https://www.bbb.org/search?find_country=USA&find_text=' + q(tile.name) +
            '&find_loc=' + q('Lenexa, KS')
    });
    if (tile.kind === 'residential') {
      list.push({
        k: 'Apartments.com',
        label: 'Lenexa listings on Apartments.com',
        href: 'https://www.apartments.com/lenexa-ks/'
      });
    }
    return list;
  }

  function extBlocks(tile) {
    var ext = tile.external || {};
    var h = '';
    var rows = [];

    if (ext.google_rating != null) {
      rows.push({ k: 'Rating', v: ext.google_rating + ' / 5' +
        (ext.google_reviews ? ' · ' + ext.google_reviews + ' reviews' : ''),
        a: 'Rating from Google Maps' });
    }
    if (ext.yelp_categories) {
      rows.push({ k: 'Category', v: [].concat(ext.yelp_categories).join(', '), a: 'Categories from Yelp' });
    }
    if (ext.yelp_rating != null) {
      rows.push({ k: 'Rating', v: ext.yelp_rating + ' / 5', a: 'Rating from Yelp' });
    }
    if (ext.osm_type) {
      rows.push({ k: 'Kind', v: ext.osm_type, a: 'Data from OpenStreetMap' });
    }
    if (ext.hours) {
      rows.push({ k: 'Hours', v: ext.hours, a: 'Hours from ' + (ext.hours_source || 'OpenStreetMap') });
    }

    if (!rows.length) {
      h += '<p class="ext-empty">No external data has been accepted onto this tile yet. ' +
           'The sweep proposes; a human accepts by pull request. ' +
           '<a href="https://github.com/' + REPO + '/blob/main/sweep/README.md" target="_blank" ' +
           'rel="noopener">How that works</a>.</p>';
    } else {
      rows.forEach(function (r) {
        h += '<div class="ext"><div class="ext-k">' + esc(r.k) + '</div>' +
             '<div class="ext-v">' + esc(r.v) + '</div>' +
             '<div class="attrib">' + esc(r.a) + '</div></div>';
      });
    }

    h += '<div class="backout-row">';
    backouts(tile).forEach(function (b) {
      h += '<a class="backout" href="' + esc(b.href) + '" target="_blank" rel="noopener">' +
           ARROW + esc(b.label) + '</a>';
    });
    h += '</div>';
    h += '<p class="relay-note">These take you to the other platform, in a new tab. ' +
         'The Commons does not follow you there, does not know whether you went, and does not ' +
         'ask you to stop using anything you already use.</p>';
    return h;
  }

  /* ---------------- drawer ---------------- */

  function byId(id) {
    return state.tiles.filter(function (t) { return t.id === id; })[0];
  }

  function favBtn(tile) {
    var twin = window.CommonsTwin && CommonsTwin.read();
    var on = !!(twin && (twin.favorites || []).indexOf(tile.id) >= 0);
    return '<button type="button" class="fav" id="fav-btn" aria-pressed="' + on + '">' +
      (on ? '★ saved on this device' : '☆ save on this device') + '</button>';
  }

  function openTile(tile, keepScroll) {
    var notes = state.notes[tile.id] || [];
    var mood = moodFor(notes);
    var m = MOODS[mood];

    els.title.textContent = tile.name;
    els.addr.textContent = tile.address;

    var wt = walkText(tile);
    var html = '';

    /* zone 1 — where it is */
    html += '<div class="dz"><h3>Where</h3>';
    html += '<p class="blurb">' + esc(tile.address) + '</p>';
    html += '<p class="' + (wt ? 'walk' : 'walk walk-far') + '">' +
            (wt ? esc(wt) + ' from where you are' :
                  'Walk time appears if you choose to share your location. Nothing is stored either way.') +
            '</p>';
    if (tile.blurb) html += '<p class="blurb">' + esc(tile.blurb) + '</p>';
    html += '<p>' + favBtn(tile) + '</p>';
    html += '</div>';

    /* zone 2 — composite state from other platforms, each with its way back */
    html += '<div class="dz"><h3>What other platforms say</h3>';
    html += extBlocks(tile);
    html += '</div>';

    /* zone 3 — mood, neighbor notes, three doors */
    html += '<div class="dz"><h3>What neighbors say here</h3>';
    html += '<p><span class="chip">' + esc(tile.kind) + '</span>' +
            '<span class="chip mood-' + mood + '">' + m.label + '</span></p>';

    if (!notes.length) {
      html += '<div class="empty-state"><strong>No notes yet.</strong><br>' +
              'This tile renders <em>hopeful</em> — light, unfinished, waiting. ' +
              'Absence of data is not a signal. Be the first neighbor to write something down.</div>';
    } else {
      html += '<p class="blurb">' + notes.length +
              (notes.length === 1 ? ' note' : ' notes') + ' &middot; ' + esc(m.blurb) + '</p>';
      notes.forEach(function (n) {
        html += '<article class="note"><div class="meta">' +
                esc(n.date || 'undated') + (n.door ? ' &middot; ' + esc(n.door) : '') +
                '</div>';
        n.text.split('\n').forEach(function (p) { html += '<p>' + esc(p) + '</p>'; });
        if (n.tags.length) {
          html += '<div class="tags">' + n.tags.map(function (t) {
            return '<span class="tag">' + esc(t) + '</span>';
          }).join('') + '</div>';
        }
        html += '</article>';
      });
    }

    html += '<div class="doors"><h3>Add a note here — pick your door</h3>';
    DOORS.forEach(function (d) {
      html += '<a class="door" href="' + issueURL(d, tile) + '" target="_blank" rel="noopener">' +
              '<strong>' + esc(d.name) + '</strong><span>' + esc(d.desc) + '</span></a>';
    });
    html += '<p class="relay-note">The three doors add a note <em>to this map</em>. The blue buttons ' +
            'above act on <em>another platform</em>. They are different things on purpose.</p>';
    html += '<p class="relay-note">These buttons open a GitHub issue form in a new tab. ' +
            'This page sends nothing, stores nothing, and notifies no authority. ' +
            'If you close that tab, nothing was sent.</p>';
    html += '<p class="relay-note">Notes for this tile live in ' +
            '<a href="https://github.com/' + REPO + '/blob/main/notes/' + esc(tile.id) + '.md" ' +
            'target="_blank" rel="noopener">notes/' + esc(tile.id) + '.md</a>. ' +
            'You can also open a pull request directly. Coordinates are approximate — ' +
            'corrections welcome.</p></div></div>';

    var scroll = keepScroll ? els.body.scrollTop : 0;
    els.body.innerHTML = html;
    els.body.scrollTop = scroll;
    els.drawer.classList.add('open');
    els.drawer.setAttribute('aria-hidden', 'false');

    var fb = document.getElementById('fav-btn');
    if (fb) fb.addEventListener('click', function () { toggleFav(tile); });

    var prevId = state.active;
    state.active = tile.id;
    if (prevId && prevId !== tile.id && state.markers[prevId]) {
      var prev = byId(prevId);
      if (prev) state.markers[prevId].setIcon(
        pinIcon(prev.kind, moodFor(state.notes[prevId] || []), false, !isNear(prev)));
    }
    if (state.markers[tile.id]) {
      state.markers[tile.id].setIcon(pinIcon(tile.kind, mood, true, !isNear(tile)));
    }
    if (!keepScroll) els.close.focus();
  }

  function toggleFav(tile) {
    if (!window.CommonsTwin) return;
    if (!CommonsTwin.exists()) {
      var ok = window.confirm(
        'Saving a favourite creates a small file in this browser only — the twin.\n\n' +
        'No account, no server, no sync. You can export it or delete it any time. Create it?');
      if (!ok) return;
      CommonsTwin.create();
    }
    var favs = CommonsTwin.get('favorites', []) || [];
    var i = favs.indexOf(tile.id);
    if (i >= 0) favs.splice(i, 1); else favs.push(tile.id);
    CommonsTwin.set('favorites', favs);
    openTile(tile, true);
    renderTwinPanel();
  }

  function closeDrawer() {
    els.drawer.classList.remove('open');
    els.drawer.setAttribute('aria-hidden', 'true');
    if (state.active && state.markers[state.active]) {
      var t = byId(state.active);
      if (t) state.markers[t.id].setIcon(
        pinIcon(t.kind, moodFor(state.notes[t.id] || []), false, !isNear(t)));
    }
    state.active = null;
  }

  els.close.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !(window.CommonsPanic && CommonsPanic.isOpen())) closeDrawer();
  });
  if (els.introToggle) {
    els.introToggle.addEventListener('click', function () {
      var hidden = els.introBody.hasAttribute('hidden');
      if (hidden) { els.introBody.removeAttribute('hidden'); els.introToggle.textContent = 'hide'; }
      else { els.introBody.setAttribute('hidden', ''); els.introToggle.textContent = 'about this map'; }
    });
  }

  // the map and the deck are the point — the explanation starts folded away, on every screen
  if (els.introBody && els.introToggle) {
    els.introBody.setAttribute('hidden', '');
    els.introToggle.textContent = 'about this map';
  }

  /* ---------------- twin panel (canon rules 9, 11, 14) ---------------- */

  function renderTwinPanel() {
    if (!els.twinPanel) return;
    var t = window.CommonsTwin ? CommonsTwin.read() : null;
    var h = '<h3>This device remembers</h3>';
    if (!t) {
      h += '<p>Nothing is stored on this device right now. The Commons works fine that way — ' +
           'this is entirely optional.</p>' +
           '<p>A twin is one small JSON file in this browser: your lens, your saved places, ' +
           'a trusted contact for the help screen, your language. No account, no server, no sync.</p>' +
           '<div class="twin-row">' +
           '<button type="button" class="twin-btn go" data-twin="create">Remember my preferences on this device</button>' +
           '<button type="button" class="twin-btn" data-twin="import">Import a twin file</button>' +
           '</div>';
    } else {
      h += '<p>' + (t.favorites || []).length + ' saved place' +
           ((t.favorites || []).length === 1 ? '' : 's') + ' · lens: ' +
           esc((t.lenses || [])[0] || 'all') + ' · trusted contact: ' +
           (t.trusted_contact ? esc(t.trusted_contact) : 'not set') + '</p>';
      h += '<div class="twin-row">' +
           '<button type="button" class="twin-btn" data-twin="contact">Set trusted contact</button>' +
           '<button type="button" class="twin-btn" data-twin="export">Export twin</button>' +
           '<button type="button" class="twin-btn" data-twin="import">Import</button>' +
           '<button type="button" class="twin-btn danger" data-twin="delete">Delete twin</button>' +
           '</div>';
      h += '<p class="src" style="font-size:.76rem;margin-top:.5rem">Deleting costs you nothing and ' +
           'leaves nothing behind. Canon rule 11.</p>';
    }
    els.twinPanel.innerHTML = h;
    Array.prototype.forEach.call(els.twinPanel.querySelectorAll('[data-twin]'), function (b) {
      b.addEventListener('click', function () { twinAction(b.getAttribute('data-twin')); });
    });
  }

  function twinAction(what) {
    if (!window.CommonsTwin) return;
    if (what === 'create') { CommonsTwin.create(); }
    if (what === 'export') { CommonsTwin.exportFile(); }
    if (what === 'delete') {
      if (window.confirm('Delete everything this browser remembers for the Commons? ' +
        'Nothing else is affected, and nothing is kept anywhere else.')) CommonsTwin.remove();
    }
    if (what === 'contact') {
      var n = window.prompt('Phone number to text from the help screen. Stored on this device only.',
        CommonsTwin.get('trusted_contact', '') || '');
      if (n != null) CommonsTwin.set('trusted_contact', String(n).replace(/[^\d+]/g, ''));
    }
    if (what === 'import') {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          if (CommonsTwin.importJSON(String(fr.result))) { applyTwin(); renderTwinPanel(); }
          else window.alert('That file was not a Commons twin. Nothing was changed.');
        };
        fr.readAsText(f);
      });
      input.click();
    }
    applyTwin();
    renderTwinPanel();
  }

  function applyTwin() {
    var t = window.CommonsTwin ? CommonsTwin.read() : null;
    if (t && (t.lenses || []).length) {
      state.lens = t.lenses[0];
    }
    refreshPins();
  }

  if (els.twinBtn && els.twinPanel) {
    els.twinBtn.addEventListener('click', function () {
      els.twinPanel.hidden = !els.twinPanel.hidden;
      if (!els.twinPanel.hidden) renderTwinPanel();
    });
  }

  /* ---------------- boot ---------------- */

  fetch('data/tiles.json')
    .then(function (r) { return r.json(); })
    .then(function (doc) {
      if (doc.geofence && doc.geofence.polygon) {
        state.geofence = L.latLngBounds(doc.geofence.polygon);
        L.polygon(doc.geofence.polygon, {
          color: '#6f8f6a', weight: 2, dashArray: '7 7', fillColor: '#cfe0c9',
          fillOpacity: 0.14, interactive: false
        }).addTo(map);
      }

      state.tiles = doc.features.map(function (f) {
        return {
          id: f.properties.id,
          name: f.properties.name,
          kind: f.properties.kind,
          address: f.properties.address,
          blurb: f.properties.blurb,
          tags: f.properties.tags || [],
          external: f.properties.external || {},
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0]
        };
      });

      if (els.count) els.count.textContent = state.tiles.length;

      state.tiles.forEach(function (t) {
        var marker = L.marker([t.lat, t.lon], {
          icon: pinIcon(t.kind, 'hopeful', false, false),
          title: t.name,
          keyboard: true,
          alt: t.name
        }).addTo(map);
        marker.on('click', function () { openTile(t); });
        marker.bindTooltip(t.name, { direction: 'top', offset: [0, -22], opacity: 0.95 });
        state.markers[t.id] = marker;
      });

      // load notes; every tile keeps the hopeful floor until proven otherwise
      return Promise.all(state.tiles.map(function (t) {
        return fetch('notes/' + t.id + '.md')
          .then(function (r) { return r.ok ? r.text() : ''; })
          .then(function (md) { state.notes[t.id] = md ? parseNotes(md) : []; })
          .catch(function () { state.notes[t.id] = []; });
      }));
    })
    .then(function () {
      applyTwin();
      refreshPins();

      // frame everything that exists, on any screen size
      var group = L.featureGroup(Object.keys(state.markers).map(function (k) { return state.markers[k]; }));
      var wide = map.getSize().x > 720;
      map.invalidateSize();
      map.fitBounds(state.geofence || group.getBounds(), {
        paddingTopLeft: wide ? [360, 40] : [18, 18],
        paddingBottomRight: wide ? [40, 40] : [18, 90],
        maxZoom: 17
      });

      // deep links, on load and on every later hash change — a shared #tile= link has to
      // land on the tile whether the page was cold or already open
      function fromHash() {
        var hash = (location.hash || '').replace('#tile=', '');
        if (!hash) return;
        var t = byId(hash);
        if (t) { map.setView([t.lat, t.lon], 17); openTile(t); }
      }
      fromHash();
      window.addEventListener('hashchange', fromHash);

      // the assistant reads the same public data anyone else can read
      if (window.CommonsAssistant && els.ask) {
        CommonsAssistant.mount(els.ask, els.answer, {
          tiles: function () { return state.tiles; },
          notes: function (id) { return state.notes[id] || []; },
          walkMinutes: walkMinutes,
          walkText: walkText,
          open: function (id) { var t = byId(id); if (t) { map.setView([t.lat, t.lon], 17); openTile(t); } }
        });
      }

      if (window.CommonsVoice && els.listen) CommonsVoice.mount(els.listen, els.dot);
      renderTwinPanel();
      askHere();
    })
    .catch(function (err) {
      var box = document.getElementById('intro-body');
      if (box) {
        box.innerHTML = '<p>The tile data did not load. Nothing was sent anywhere; ' +
          'the map is simply empty right now. You can read the tiles directly in ' +
          '<a href="https://github.com/' + REPO + '/blob/main/data/tiles.json">data/tiles.json</a>.</p>';
      }
      if (window.console) console.warn(err);
    });
})();
