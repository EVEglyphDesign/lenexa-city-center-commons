/* lenexa-city-center-commons — map surface.
   Everything here runs in the visitor's browser. Nothing is transmitted from this page.
   No accounts, no cookies, no analytics, no storage. */

(function () {
  'use strict';

  var REPO = 'EVEglyphDesign/lenexa-city-center-commons';
  var ISSUE_BASE = 'https://github.com/' + REPO + '/issues/new';
  var WINDOW_DAYS = 365; // rolling window for mood

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

  var els = {
    drawer: document.getElementById('drawer'),
    title: document.getElementById('drawer-title'),
    addr: document.getElementById('drawer-addr'),
    body: document.getElementById('drawer-body'),
    close: document.getElementById('drawer-close'),
    count: document.getElementById('tile-count'),
    introToggle: document.getElementById('intro-toggle'),
    introBody: document.getElementById('intro-body')
  };

  var state = { tiles: [], notes: {}, markers: {}, active: null, geofence: null };

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

  function pinIcon(kind, mood, active) {
    var m = MOODS[mood];
    var glyph = ICONS[kind] || ICONS.civic;
    var html =
      '<div class="pin-body" style="background:' + m.fill + ';border-color:' + m.color +
      ';opacity:' + m.opacity + '">' +
      '<svg viewBox="0 0 16 16" fill="none" stroke="' + m.color +
      '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + glyph + '</svg></div>';
    return L.divIcon({
      className: 'tile-pin mood-' + mood + (active ? ' is-active' : ''),
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

  /* ---------------- drawer ---------------- */

  function openTile(tile) {
    var notes = state.notes[tile.id] || [];
    var mood = moodFor(notes);
    var m = MOODS[mood];

    els.title.textContent = tile.name;
    els.addr.textContent = tile.address;

    var html = '';
    html += '<p><span class="chip">' + esc(tile.kind) + '</span>' +
            '<span class="chip mood-' + mood + '">' + m.label + '</span></p>';
    if (tile.blurb) html += '<p class="blurb">' + esc(tile.blurb) + '</p>';

    if (!notes.length) {
      html += '<div class="empty-state"><strong>No notes yet.</strong><br>' +
              'This tile renders <em>hopeful</em> — light, unfinished, waiting. ' +
              'Absence of data is not a signal. Be the first neighbor to write something down.</div>';
    } else {
      html += '<p class="blurb" style="margin-top:1rem">' + notes.length +
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

    html += '<div class="doors"><h3>Add a note — pick your door</h3>';
    DOORS.forEach(function (d) {
      html += '<a class="door" href="' + issueURL(d, tile) + '" target="_blank" rel="noopener">' +
              '<strong>' + esc(d.name) + '</strong><span>' + esc(d.desc) + '</span></a>';
    });
    html += '<p class="relay-note">These buttons open a GitHub issue form in a new tab. ' +
            'This page sends nothing, stores nothing, and notifies no authority. ' +
            'If you close that tab, nothing was sent.</p>';
    html += '<p class="relay-note">Notes for this tile live in ' +
            '<a href="https://github.com/' + REPO + '/blob/main/notes/' + esc(tile.id) + '.md" ' +
            'target="_blank" rel="noopener">notes/' + esc(tile.id) + '.md</a>. ' +
            'You can also open a pull request directly. Coordinates are approximate — ' +
            'corrections welcome.</p></div>';

    els.body.innerHTML = html;
    els.body.scrollTop = 0;
    els.drawer.classList.add('open');
    els.drawer.setAttribute('aria-hidden', 'false');

    if (state.active && state.markers[state.active]) {
      var prev = state.tiles.filter(function (t) { return t.id === state.active; })[0];
      if (prev) state.markers[prev.id].setIcon(pinIcon(prev.kind, moodFor(state.notes[prev.id] || []), false));
    }
    state.active = tile.id;
    state.markers[tile.id].setIcon(pinIcon(tile.kind, mood, true));
    els.close.focus();
  }

  function closeDrawer() {
    els.drawer.classList.remove('open');
    els.drawer.setAttribute('aria-hidden', 'true');
    if (state.active && state.markers[state.active]) {
      var t = state.tiles.filter(function (x) { return x.id === state.active; })[0];
      if (t) state.markers[t.id].setIcon(pinIcon(t.kind, moodFor(state.notes[t.id] || []), false));
    }
    state.active = null;
  }

  els.close.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  if (els.introToggle) {
    els.introToggle.addEventListener('click', function () {
      var hidden = els.introBody.hasAttribute('hidden');
      if (hidden) { els.introBody.removeAttribute('hidden'); els.introToggle.textContent = 'hide'; }
      else { els.introBody.setAttribute('hidden', ''); els.introToggle.textContent = 'about this map'; }
    });
  }

  // on narrow screens the map is the point — start the intro card collapsed
  if (els.introBody && els.introToggle && document.getElementById('map').clientWidth <= 720) {
    els.introBody.setAttribute('hidden', '');
    els.introToggle.textContent = 'about this map';
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
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0]
        };
      });

      if (els.count) els.count.textContent = state.tiles.length;

      state.tiles.forEach(function (t) {
        var marker = L.marker([t.lat, t.lon], {
          icon: pinIcon(t.kind, 'hopeful', false),
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
      state.tiles.forEach(function (t) {
        state.markers[t.id].setIcon(pinIcon(t.kind, moodFor(state.notes[t.id] || []), false));
      });
      // frame everything that exists, on any screen size
      var group = L.featureGroup(Object.keys(state.markers).map(function (k) { return state.markers[k]; }));
      var wide = map.getSize().x > 720;
      // frame the geofence itself; the one anchor tile east of it stays a short pan away
      map.invalidateSize();
      map.fitBounds(state.geofence || group.getBounds(), {
        paddingTopLeft: wide ? [360, 40] : [18, 18],
        paddingBottomRight: wide ? [40, 40] : [18, 90],
        maxZoom: 17
      });

      var hash = (location.hash || '').replace('#tile=', '');
      if (hash) {
        var t = state.tiles.filter(function (x) { return x.id === hash; })[0];
        if (t) { map.setView([t.lat, t.lon], 17); openTile(t); }
      }
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
