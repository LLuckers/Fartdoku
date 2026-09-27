/* Fartdoku – Benutzeroberfläche (Routing, Startseite, Spielbrett, Auflösung). */
(function () {
  'use strict';

  var FD = null;
  var $app = null;
  var $toasts = null;
  var $rules = null;

  var STORE = 'fartdoku:';
  var COLS = 'ABCDEFGH';
  var MAX_HINTS = 3;
  var LEVEL_VAR = { 1: 'var(--gas)', 2: 'var(--sky)', 3: 'var(--orange)', 4: 'var(--pink)' };
  var SNACK_SUB = 'Das Beweisstück – wurde vom Täter allein im Raum verputzt.';

  var G = null;              // aktueller Spielzustand
  var routeSeq = 0;          // schützt vor veralteten Ladevorgängen
  var pendingRandom = null;  // {n, level, seed} für #zufall

  /* ---------- Hilfsfunktionen ---------- */

  function load(key) {
    try {
      var raw = window.localStorage.getItem(STORE + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function save(key, val) {
    try { window.localStorage.setItem(STORE + key, JSON.stringify(val)); } catch (e) { /* egal */ }
  }
  function drop(key) {
    try { window.localStorage.removeItem(STORE + key); } catch (e) { /* egal */ }
  }

  function getSolved() {
    var s = load('solved');
    return s && typeof s === 'object' ? s : {};
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ms) {
    var t = Math.max(0, Math.floor((ms || 0) / 1000));
    return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60);
  }
  function joinNames(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(', ') + ' und ' + list[list.length - 1];
  }
  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function levelName(level) {
    var l = (FD.LEVELS || []).filter(function (x) { return x.level === level; })[0];
    return l ? l.name : 'Stufe ' + level;
  }
  function findCase(id) {
    return (FD.CASES || []).filter(function (c) { return c.id === id; })[0] || null;
  }
  function dogById(id) {
    return (FD.DOGS || []).filter(function (d) { return d.id === id; })[0] || null;
  }

  /* SVG-Grafiken aus FD.art – mit schlichtem Ersatz, falls art.js fehlt oder patzt. */
  function art(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    try {
      if (FD && FD.art && typeof FD.art[fn] === 'function') {
        var out = FD.art[fn].apply(FD.art, args);
        if (out) return out;
      }
    } catch (e) {
      if (window.console) console.warn('FD.art.' + fn + ' fehlgeschlagen', e);
    }
    return fallbackArt(fn, args);
  }
  function fallbackArt(fn) {
    if (fn === 'frenchie' || fn === 'logoMascot') {
      return '<svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true"><path d="M22 30 L40 62 L30 70Z M98 30 L80 62 L90 70Z" fill="#16121A"/><ellipse cx="60" cy="70" rx="38" ry="34" fill="#16121A"/><circle cx="46" cy="64" r="6" fill="#fff"/><circle cx="74" cy="64" r="6" fill="#fff"/><ellipse cx="60" cy="84" rx="9" ry="6" fill="#444"/></svg>';
    }
    if (fn === 'cloud') {
      return '<svg viewBox="0 0 100 70" width="100%" height="100%" aria-hidden="true"><path d="M20 58 a16 16 0 0 1 4-30 a20 20 0 0 1 36-10 a18 18 0 0 1 28 16 a13 13 0 0 1-4 24Z" fill="#86E05A" stroke="#16121A" stroke-width="4" stroke-linejoin="round"/></svg>';
    }
    if (fn === 'clothespin') {
      return '<svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true"><rect x="16" y="4" width="8" height="32" rx="3" fill="#FFB627" stroke="#16121A" stroke-width="3"/><circle cx="20" cy="18" r="3" fill="#16121A"/></svg>';
    }
    if (fn === 'snack') {
      return '<svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true"><path d="M6 28 L34 14 L34 30 L6 30Z" fill="#FFD23F" stroke="#16121A" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="25" r="2.5" fill="#E0A800"/></svg>';
    }
    return '<svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true"><rect x="8" y="8" width="24" height="24" rx="4" fill="#fff" stroke="#16121A" stroke-width="3"/></svg>';
  }

  function starPolygon(points, outerA, outerB, inner) {
    var pts = [];
    for (var i = 0; i < points * 2; i++) {
      var a = (Math.PI * i) / points - Math.PI / 2;
      var r = i % 2 ? inner : (i % 4 === 0 ? outerA : outerB);
      pts.push((50 + Math.cos(a) * r).toFixed(1) + '% ' + (50 + Math.sin(a) * r).toFixed(1) + '%');
    }
    return 'polygon(' + pts.join(',') + ')';
  }

  function cloudPips(count, max) {
    var h = '';
    for (var i = 1; i <= max; i++) {
      h += '<span class="pip' + (i <= count ? '' : ' off') + '">' + art('cloud', i % 3) + '</span>';
    }
    return '<span class="pips" aria-hidden="true">' + h + '</span>';
  }

  /* ---------- Toasts ---------- */

  function toast(msg, kind) {
    if (!$toasts) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.textContent = msg;
    $toasts.appendChild(el);
    while ($toasts.children.length > 3) $toasts.removeChild($toasts.firstChild);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, 3400);
  }

  /* ---------- Regeln ---------- */

  function rulesHTML() {
    return '' +
      '<ol class="rules-list">' +
      '<li><b>Eine Figur pro Reihe und Spalte.</b> Jede Reihe und jede Spalte enthält genau eine Figur: alle Frenchies plus das Beweisstück.</li>' +
      '<li><b>Möbel stehen im Weg.</b> Auf Regalen, Kaminen, Kühlschränken &amp; Co. liegt niemand. Samtkissen, Teppiche, Sessel und Hundekörbe sind dagegen erlaubt.</li>' +
      '<li><b>Zeugen lügen nie.</b> Jede Aussage im Dossier stimmt. Ja, sogar die der Nachbarskatze.</li>' +
      '<li><b>„Neben“ heißt Tuchfühlung.</b> Direkt links, rechts, oberhalb oder unterhalb – und im selben Raum. Durch Wände wird nicht gekuschelt.</li>' +
      '<li><b>Himmelsrichtungen.</b> „Nördlich von“ heißt: irgendwo weiter oben, nicht zwingend direkt darüber. Süden, Osten und Westen entsprechend.</li>' +
      '<li><b>Der Täter.</b> Wer als einziger Frenchie mit dem Beweisstück im selben Raum war, hat die Gaswolke gezündet.</li>' +
      '</ol>' +
      '<figure class="neben-demo">' +
      '<div class="neben-grid" aria-hidden="true">' +
      '<span class="nb r1"></span><span class="nb r1 ok">✓</span><span class="nb r2"></span>' +
      '<span class="nb r1 ok">✓</span><span class="nb r1 me">P</span><span class="nb r2 no wall-l">✗</span>' +
      '<span class="nb r1"></span><span class="nb r1 ok">✓</span><span class="nb r2"></span>' +
      '</div>' +
      '<figcaption>Pierre (P) in der Mitte: Die grünen Felder liegen „neben“ ihm. Rechts ist eine Wand dazwischen – das zählt nicht.</figcaption>' +
      '</figure>' +
      '<p class="rules-controls"><b>Bedienung:</b> Figur im Dossier oder in der Hand wählen (Tasten 1–9), dann ein Feld antippen. ' +
      'Rechtsklick, Shift-Klick oder der Modus „Ausschließen“ setzt ein ×. Pfeiltasten bewegen, Entf entfernt, X wechselt den Modus, Strg+Z macht rückgängig.</p>';
  }

  function openRules() {
    if (!$rules) return;
    $rules.innerHTML = '<div class="modal-inner">' +
      '<div class="modal-head"><h2 id="rules-title">So wird ermittelt</h2>' +
      '<button type="button" class="btn btn-icon" data-close aria-label="Regeln schließen">×</button></div>' +
      rulesHTML() + '</div>';
    if (typeof $rules.showModal === 'function') {
      try { $rules.showModal(); } catch (e) { $rules.setAttribute('open', ''); }
    } else {
      $rules.setAttribute('open', '');
    }
    var b = $rules.querySelector('[data-close]');
    if (b) b.focus();
  }
  function closeRules() {
    if (!$rules) return;
    if (typeof $rules.close === 'function' && $rules.open) $rules.close();
    else $rules.removeAttribute('open');
  }
  function rulesOpen() { return !!($rules && ($rules.open || $rules.hasAttribute('open'))); }

  /* ---------- Routing ---------- */

  function route() {
    routeSeq++;
    closeReveal();
    var h = (location.hash || '').replace(/^#/, '');
    if (/^fall-\d+$/.test(h) && findCase(h)) { openCase(h); return; }
    if (h === 'zufall') { openRandom(); return; }
    renderHome();
  }

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  /* ---------- Startseite ---------- */

  function renderHome() {
    leaveGame();
    document.title = 'Fartdoku';
    var solved = getSolved();
    var cases = FD.CASES || [];
    var open = cases.filter(function (c) { return !solved[c.id]; });
    var anySolved = cases.some(function (c) { return solved[c.id]; });
    var ctaHref, ctaText;
    if (!open.length) { ctaHref = '#zufall'; ctaText = 'Zufallsfall würfeln'; }
    else if (!anySolved) { ctaHref = '#' + open[0].id; ctaText = 'Fall ' + pad2(open[0].no) + ' starten'; }
    else { ctaHref = '#' + open[0].id; ctaText = 'Weiterermitteln: Fall ' + pad2(open[0].no); }

    var cfg = load('random') || {};
    var rn = [5, 6, 7, 8].indexOf(cfg.n) >= 0 ? cfg.n : 6;
    var rl = [1, 2, 3, 4].indexOf(cfg.level) >= 0 ? cfg.level : 2;

    var h = '';
    h += '<main class="home wrap">';

    // Hero
    h += '<header class="hero">' +
      '<div class="hero-text">' +
      '<h1 class="logo" aria-label="Fartdoku"><span aria-hidden="true">FARTD</span>' +
      '<span class="logo-o" aria-hidden="true">' + art('frenchie', 'none', { mood: 'smug' }) + '</span>' +
      '<span aria-hidden="true">KU</span></h1>' +
      '<p class="tagline">„Ein Rätsel, das zum Himmel stinkt.“</p>' +
      '<p class="premise">Im Schloss Le Pups gab es einen olfaktorischen Zwischenfall der Stufe 4. Finde heraus, welcher Frenchie wo war – und wer die Gaswolke gezündet hat.</p>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary btn-big" href="' + ctaHref + '">' + esc(ctaText) + '</a>' +
      '<button type="button" class="btn" data-scroll="regeln">So wird ermittelt</button>' +
      '</div></div>' +
      '<div class="hero-art" aria-hidden="true">' +
      '<div class="hero-cloud hc-1">' + art('cloud', 1) + '</div>' +
      '<div class="hero-cloud hc-2">' + art('cloud', 2) + '</div>' +
      '<div class="hero-mascot">' + art('logoMascot') + '</div>' +
      '</div>' +
      '</header>';

    // Fallakten
    h += '<section class="section" aria-labelledby="h-akten"><h2 class="section-title" id="h-akten">Die Fallakten</h2>';
    h += '<div class="case-grid">';
    cases.forEach(function (c, i) {
      var s = solved[c.id];
      var tilt = (i % 2 ? 1.5 : -1.5) * (i % 3 === 2 ? 0.6 : 1);
      h += '<a class="case-card' + (s ? ' is-solved' : '') + '" href="#' + c.id + '" style="--tilt:' + tilt + 'deg;--lvl:' + LEVEL_VAR[c.level] + '"' +
        ' aria-label="Fall ' + pad2(c.no) + ': ' + esc(c.title) + ', ' + esc(levelName(c.level)) + ', ' + c.n + ' mal ' + c.n + (s ? ', gelöst in ' + fmtTime(s.time) : '') + '">' +
        '<span class="case-band"><span class="case-no">FALL ' + pad2(c.no) + '</span><span class="case-size">' + c.n + '×' + c.n + '</span></span>' +
        '<span class="case-body">' +
        '<span class="case-snack" aria-hidden="true">' + art('snack', c.snack) + '</span>' +
        '<span class="case-title">' + esc(c.title) + '</span>' +
        '<span class="case-level">' + cloudPips(c.level, 4) + '<span>' + esc(levelName(c.level)) + '</span></span>' +
        '</span>' +
        (s ? '<span class="stamp" aria-hidden="true">GELÖST<span>' + fmtTime(s.time) + '</span></span>' : '') +
        '</a>';
    });
    h += '</div></section>';

    // Zufallsfall
    h += '<section class="section" aria-labelledby="h-zufall"><h2 class="section-title" id="h-zufall">Zufallsfall</h2>' +
      '<div class="panel random-panel">' +
      '<p class="panel-lead">Noch nicht genug gerochen? Das Schloss würfelt dir einen frischen Fall.</p>' +
      '<fieldset class="seg-field"><legend>Größe</legend><div class="seg">';
    [5, 6, 7, 8].forEach(function (n) {
      h += '<label><input type="radio" name="rnd-n" value="' + n + '"' + (n === rn ? ' checked' : '') + '><span>' + n + '×' + n + '</span></label>';
    });
    h += '</div></fieldset><fieldset class="seg-field"><legend>Schwierigkeit</legend><div class="seg seg-wrap">';
    (FD.LEVELS || []).forEach(function (l) {
      h += '<label style="--lvl:' + LEVEL_VAR[l.level] + '"><input type="radio" name="rnd-l" value="' + l.level + '"' + (l.level === rl ? ' checked' : '') + '><span>' + esc(l.name) + '</span></label>';
    });
    h += '</div></fieldset>' +
      '<button type="button" class="btn btn-primary btn-big" data-action="roll">Neuen Fall würfeln</button>' +
      '</div></section>';

    // Verdächtige
    h += '<section class="section" aria-labelledby="h-dogs"><h2 class="section-title" id="h-dogs">Die Verdächtigen</h2><div class="dog-grid">';
    (FD.DOGS || []).forEach(function (d, i) {
      h += '<article class="dog-card" style="--dog:' + esc(d.color) + ';--tilt:' + (i % 2 ? 1 : -1) + 'deg">' +
        '<div class="dog-portrait" aria-hidden="true">' + art('frenchie', d.id, { mood: 'normal' }) + '</div>' +
        '<div class="dog-info"><h3>' + esc(d.name) + '</h3>' +
        '<p class="dog-title">' + esc(d.title) + '</p>' +
        '<p class="dog-bio">' + esc(d.bio) + '</p>' +
        '<p class="dog-quirk">' + esc(d.quirk) + '</p>' +
        '<p class="dog-class">Furz-Klasse: <b>' + esc(d.fartClass) + '</b></p></div>' +
        '</article>';
    });
    h += '</div>';
    h += '<h3 class="sub-title">Die Beweisstücke</h3><div class="snack-row">';
    Object.keys(FD.SNACKS || {}).forEach(function (k) {
      var s = FD.SNACKS[k];
      h += '<article class="snack-card">' +
        '<div class="snack-art" aria-hidden="true">' + art('snack', k) + '</div>' +
        '<h4>' + esc(s.name) + '</h4>' +
        '<p class="stink" aria-label="Stinkfaktor ' + s.stink + ' von 5">' + cloudPips(s.stink, 5) + '</p>' +
        '<p class="snack-bio">' + esc(s.bio) + '</p>' +
        '</article>';
    });
    h += '</div></section>';

    // Regeln
    h += '<section class="section" id="regeln" aria-labelledby="h-regeln"><h2 class="section-title" id="h-regeln">So wird ermittelt</h2>' +
      '<div class="panel rules-panel">' + rulesHTML() + '</div></section>';

    h += '<footer class="footer">Fartdoku – nach dem Prinzip von Murdoku. Beim Rätseln wurden keine echten Frenchies gestört. Nur belästigt.</footer>';
    h += '</main>';

    $app.innerHTML = h;
    window.scrollTo(0, 0);
  }

  /* ---------- Spiel laden ---------- */

  function showLoading(label) {
    $app.innerHTML = '<main class="wrap loading" aria-busy="true">' +
      '<div class="loading-card"><div class="loading-dog" aria-hidden="true">' + art('frenchie', 'bruno', { mood: 'normal' }) + '</div>' +
      '<p>' + esc(label || 'Die Spürnasen schnüffeln den Tatort ab …') + '</p></div></main>';
    window.scrollTo(0, 0);
  }
  function showError(msg) {
    $app.innerHTML = '<main class="wrap loading"><div class="loading-card"><p>' + esc(msg) + '</p>' +
      '<a class="btn" href="#akten">← Zu den Akten</a></div></main>';
  }

  function openCase(id) {
    leaveGame();
    var seq = routeSeq;
    var c = findCase(id);
    showLoading('Fall ' + pad2(c.no) + ' wird aus dem Archiv geholt …');
    setTimeout(function () {
      if (seq !== routeSeq) return;
      var p;
      try { p = FD.getCase(id); } catch (e) {
        if (window.console) console.error(e);
        showError('Die Akte klebt. Fall konnte nicht geladen werden.');
        return;
      }
      if (seq !== routeSeq) return;
      startGame(p, id);
    }, 40);
  }

  function openRandom() {
    leaveGame();
    var seq = routeSeq;
    var cfg = pendingRandom || load('random') || {};
    pendingRandom = null;
    var n = [5, 6, 7, 8].indexOf(+cfg.n) >= 0 ? +cfg.n : 6;
    var level = [1, 2, 3, 4].indexOf(+cfg.level) >= 0 ? +cfg.level : 2;
    var seed = cfg.seed || Date.now();
    showLoading('Das Schloss würfelt einen neuen Fall …');
    setTimeout(function () {
      if (seq !== routeSeq) return;
      var p;
      try { p = FD.generateRandom({ n: n, level: level, seed: seed }); } catch (e) {
        if (window.console) console.error(e);
        showError('Der Würfel ist unter den Kamin gerollt. Bitte nochmal versuchen.');
        return;
      }
      if (seq !== routeSeq) return;
      startGame(p, null);
    }, 40);
  }

  /* ---------- Spielzustand ---------- */

  function startGame(puzzle, key) {
    var n = puzzle.n;
    var T = puzzle.tokens.length;
    G = {
      p: puzzle, key: key, n: n,
      cells: puzzle.board.cells,
      place: fill(T, -1),
      marks: fill(n * n, false),
      hinted: fill(T, false),
      struck: {},
      selected: 0,
      mode: 'place',
      undo: [],
      elapsed: 0, running: false, t0: 0, tick: null,
      hints: 0,
      solved: false,
      focus: 0,
      clearArmed: null,
      prevOcc: fill(n * n, -2),
      els: {}
    };
    if (key) restoreProgress();
    var s = key ? getSolved()[key] : null;
    G.prevSolved = s || null;
    G.selected = nextUnplaced(-1);
    renderGame();
    updateAll(true);
    startTimer();
  }

  function fill(len, v) { var a = []; for (var i = 0; i < len; i++) a.push(v); return a; }

  function restoreProgress() {
    var pr = load('progress:' + G.key);
    if (!pr || !Array.isArray(pr.place) || pr.place.length !== G.place.length) return;
    var N = G.n * G.n;
    var ok = pr.place.every(function (c) {
      return c === -1 || (typeof c === 'number' && c >= 0 && c < N && c % 1 === 0 && !G.cells[c].blocked);
    });
    if (!ok) return;
    G.place = pr.place.slice();
    if (Array.isArray(pr.marks)) pr.marks.forEach(function (i) { if (i >= 0 && i < N) G.marks[i] = true; });
    if (Array.isArray(pr.hinted) && pr.hinted.length === G.hinted.length) G.hinted = pr.hinted.map(Boolean);
    if (pr.struck && typeof pr.struck === 'object') G.struck = pr.struck;
    G.elapsed = Math.max(0, +pr.elapsed || 0);
    G.hints = Math.min(MAX_HINTS, Math.max(0, +pr.hints || 0));
  }

  function saveProgress() {
    if (!G || !G.key || G.solved) return;
    var marks = [];
    G.marks.forEach(function (m, i) { if (m) marks.push(i); });
    save('progress:' + G.key, {
      v: 1, place: G.place, marks: marks, hinted: G.hinted, struck: G.struck,
      elapsed: elapsedNow(), hints: G.hints
    });
  }

  function leaveGame() {
    if (!G) return;
    pauseTimer();
    saveProgress();
    clearTimeout(G.clearArmed);
    G = null;
  }

  /* ---------- Timer ---------- */

  function elapsedNow() { return G ? G.elapsed + (G.running ? Date.now() - G.t0 : 0) : 0; }
  function startTimer() {
    if (!G || G.solved || G.running || document.hidden) return;
    G.running = true;
    G.t0 = Date.now();
    var ticks = 0;
    G.tick = setInterval(function () {
      renderTimer();
      if (++ticks % 10 === 0) saveProgress();
    }, 1000);
    renderTimer();
  }
  function pauseTimer() {
    if (!G || !G.running) return;
    G.elapsed += Date.now() - G.t0;
    G.running = false;
    clearInterval(G.tick);
    renderTimer();
  }
  function renderTimer() {
    if (G && G.els.timer) G.els.timer.textContent = fmtTime(elapsedNow());
  }

  /* ---------- Spielbildschirm ---------- */

  function tokenArt(t, mood) {
    var tok = G.p.tokens[t];
    return tok.kind === 'snack' ? art('snack', tok.id) : art('frenchie', tok.id, { mood: mood || 'normal' });
  }
  function tokenColor(t) {
    var tok = G.p.tokens[t];
    return tok.kind === 'snack' ? 'var(--cheese)' : (tok.color || (dogById(tok.id) || {}).color || 'var(--sky)');
  }
  function tokenName(t) { return G.p.tokens[t].name; }
  function cellName(i) { var n = G.n; return COLS[i % n] + (Math.floor(i / n) + 1); }
  function roomName(key) { return (FD.ROOMS[key] || {}).name || key; }

  function renderGame() {
    var p = G.p, n = G.n;
    var caseLabel = p.no ? 'FALL ' + pad2(p.no) : 'ZUFALLSFALL';
    document.title = (p.no ? 'Fall ' + pad2(p.no) : 'Zufallsfall') + ': ' + p.title + ' – Fartdoku';

    var h = '<main class="game wrap" style="--lvl:' + LEVEL_VAR[p.level] + '">';
    h += '<div class="topbar">' +
      '<a class="btn btn-small" href="#akten">← Zu den Akten</a>' +
      '<h1 class="game-title"><span class="game-no">' + caseLabel + '</span> · ' + esc(p.title) + '</h1>' +
      '<span class="chip">' + esc(p.levelName || levelName(p.level)) + '</span>' +
      '<span class="timer" role="timer" aria-label="Verstrichene Zeit">00:00</span>' +
      '<button type="button" class="btn btn-icon" data-action="rules" aria-label="Regeln anzeigen">?</button>' +
      '</div>';

    h += '<section class="akte" aria-label="Die Akte">' +
      '<span class="akte-pin" aria-hidden="true">' + art('clothespin') + '</span>' +
      '<span class="akte-label">Die Akte' + (p.mapName ? ' · ' + esc(p.mapName) : '') + '</span>' +
      '<p>' + esc(p.story) + '</p>' +
      (G.prevSolved ? '<p class="akte-solved">Bereits gelöst in ' + fmtTime(G.prevSolved.time) + '. Nochmal schnüffeln schadet nie.</p>' : '') +
      '</section>';

    h += '<div class="game-cols">';

    // Brett
    h += '<section class="board-col" aria-label="Tatort">';
    h += '<div class="board-frame" style="--n:' + n + '">' +
      '<div class="compass" aria-hidden="true"><span class="compass-arrow">▲</span>N</div>' +
      '<div class="board-grid">' +
      '<span class="corner" aria-hidden="true"></span>' +
      '<div class="col-labels" aria-hidden="true">';
    for (var c = 0; c < n; c++) h += '<span>' + COLS[c] + '</span>';
    h += '</div><div class="row-labels" aria-hidden="true">';
    for (var r = 0; r < n; r++) h += '<span>' + (r + 1) + '</span>';
    h += '</div>';
    h += '<div class="board" role="group" aria-label="Spielbrett ' + n + ' mal ' + n + '">' + boardCellsHTML() + '</div>';
    h += '</div></div>';

    // Hand
    h += '<div class="hand' + (p.tokens.length > 6 ? ' is-crowded' : '') + '" role="group" aria-label="Figuren">';
    p.tokens.forEach(function (tok, t) {
      h += '<button type="button" class="hand-chip" data-t="' + t + '" style="--tc:' + tokenColor(t) + '" aria-label="' + esc(tok.name) + ' auswählen (Taste ' + (t + 1) + ')">' +
        '<span class="hand-art" aria-hidden="true">' + tokenArt(t) + '</span><span class="hand-key" aria-hidden="true">' + (t + 1) + '</span></button>';
    });
    h += '<span class="hand-name" aria-hidden="true"></span></div>';

    // Werkzeuge
    h += '<div class="toolbar">' +
      '<div class="mode-toggle" role="group" aria-label="Modus">' +
      '<button type="button" data-mode="place" aria-pressed="true">Setzen</button>' +
      '<button type="button" data-mode="mark" aria-pressed="false">Ausschließen (×)</button>' +
      '</div>' +
      '<button type="button" class="btn" data-action="undo">↶ Rückgängig</button>' +
      '<button type="button" class="btn" data-action="hint"><span>Tipp</span><span class="pins" aria-hidden="true">' +
      pinHTML() + pinHTML() + pinHTML() + '</span></button>' +
      '<button type="button" class="btn btn-clear" data-action="clear">Leeren</button>' +
      '<button type="button" class="btn btn-primary btn-solve" data-action="solve">Fall lösen</button>' +
      '</div>' +
      '<p class="status"></p>';
    // Raumlegende
    h += '<ul class="legend" aria-label="Räume">';
    p.board.rooms.forEach(function (rk) {
      h += '<li><span class="legend-sw" style="background:' + esc((FD.ROOMS[rk] || {}).color || '#eee') + '"></span>' + esc(roomName(rk)) + '</li>';
    });
    h += '</ul>';

    h += '</section>';

    // Dossier
    h += '<section class="dossier" aria-label="Dossier">' + dossierHTML() + '</section>';
    h += '</div></main>';

    $app.innerHTML = h;
    window.scrollTo(0, 0);

    var root = $app;
    G.els = {
      root: root,
      timer: root.querySelector('.timer'),
      board: root.querySelector('.board'),
      frame: root.querySelector('.board-frame'),
      cells: Array.prototype.slice.call(root.querySelectorAll('.cell')),
      cards: Array.prototype.slice.call(root.querySelectorAll('.dcard[data-t]')),
      chips: Array.prototype.slice.call(root.querySelectorAll('.hand-chip')),
      hand: root.querySelector('.hand'),
      handName: root.querySelector('.hand-name'),
      modeBtns: Array.prototype.slice.call(root.querySelectorAll('[data-mode]')),
      undo: root.querySelector('[data-action="undo"]'),
      hint: root.querySelector('[data-action="hint"]'),
      pins: Array.prototype.slice.call(root.querySelectorAll('.pins .pin')),
      clear: root.querySelector('[data-action="clear"]'),
      solve: root.querySelector('[data-action="solve"]'),
      status: root.querySelector('.status')
    };

    var board = G.els.board;
    board.addEventListener('click', onBoardClick);
    board.addEventListener('contextmenu', onBoardContext);
    board.addEventListener('keydown', onBoardKey);
    board.addEventListener('focusin', function (e) {
      var cell = e.target.closest && e.target.closest('.cell');
      if (cell && G) setFocus(+cell.getAttribute('data-i'), false);
    });
  }

  function pinHTML() { return '<span class="pin">' + art('clothespin') + '</span>'; }

  function boardCellsHTML() {
    var n = G.n, cells = G.cells;
    var seenRoom = {};
    var h = '';
    cells.forEach(function (cell) {
      var i = cell.i, r = cell.r, c = cell.c;
      var cls = ['cell'];
      var same = function (rr, cc) { return rr >= 0 && rr < n && cc >= 0 && cc < n && cells[rr * n + cc].room === cell.room; };
      if (r > 0 && !same(r - 1, c)) cls.push('w-t');
      if (c < n - 1 && !same(r, c + 1)) cls.push('w-r');
      if (r < n - 1 && !same(r + 1, c)) cls.push('w-b');
      if (c > 0 && !same(r, c - 1)) cls.push('w-l');
      if (c === n - 1) cls.push('e-r');
      if (r === n - 1) cls.push('e-b');
      var o = cell.obj ? FD.OBJECTS[cell.obj] : null;
      if (cell.blocked) cls.push('is-blocked');
      else if (o) cls.push('has-seat');
      var inner = '';
      if (!seenRoom[cell.room]) {
        seenRoom[cell.room] = true;
        var span = 1;
        while (c + span < n && same(r, c + span)) span++;
        inner += '<span class="c-label" style="--span:' + span + '" aria-hidden="true">' + esc(roomName(cell.room)) + '</span>';
      }
      if (o) inner += '<span class="c-obj" aria-hidden="true">' + art('object', cell.obj) + '</span>';
      inner += '<span class="c-x" aria-hidden="true">×</span><span class="c-tok"></span>';
      h += '<button type="button" class="' + cls.join(' ') + '" data-i="' + i + '" tabindex="-1" style="--room:' +
        esc((FD.ROOMS[cell.room] || {}).color || '#eee') + '"' + (cell.blocked ? ' aria-disabled="true"' : '') + '>' + inner + '</button>';
    });
    return h;
  }

  function dossierHTML() {
    var p = G.p;
    var byT = {};
    var general = [];
    p.clues.forEach(function (cl, ci) {
      if (cl.subject == null || cl.subject < 0 || cl.subject >= p.tokens.length) general.push(ci);
      else (byT[cl.subject] = byT[cl.subject] || []).push(ci);
    });
    var h = '<h2 class="dossier-title">Dossier</h2>';
    p.tokens.forEach(function (tok, t) {
      var dog = tok.kind === 'dog' ? dogById(tok.id) : null;
      var sub = tok.kind === 'snack' ? SNACK_SUB : (dog ? dog.title : 'Verdächtiger');
      h += '<article class="dcard' + (tok.kind === 'snack' ? ' is-snack' : '') + '" data-t="' + t + '" style="--tc:' + tokenColor(t) + '">' +
        '<button type="button" class="dcard-head" aria-pressed="false">' +
        '<span class="dcard-portrait" aria-hidden="true">' + tokenArt(t) + '</span>' +
        '<span class="dcard-names"><span class="dcard-name">' + esc(tok.name) + '</span>' +
        '<span class="dcard-sub">' + esc(sub) + '</span></span>' +
        '<span class="dcard-key" aria-hidden="true">' + (t + 1) + '</span>' +
        '<span class="dcard-check" aria-hidden="true">✓</span>' +
        '</button>' + cluesHTML(byT[t] || []) + '</article>';
    });
    if (general.length) {
      h += '<article class="dcard is-general"><div class="dcard-head dcard-head-static">' +
        '<span class="dcard-portrait" aria-hidden="true">' + art('cloud', 0) + '</span>' +
        '<span class="dcard-names"><span class="dcard-name">Weitere Beweise</span><span class="dcard-sub">Spuren, Messwerte, Gerüchte</span></span>' +
        '</div>' + cluesHTML(general) + '</article>';
    }
    return h;
  }

  function cluesHTML(list) {
    if (!list.length) return '<p class="no-clues">Keine Aussagen. Verdächtig still.</p>';
    var h = '<ul class="clues">';
    list.forEach(function (ci) {
      var cl = G.p.clues[ci];
      var struck = !!G.struck[ci];
      h += '<li><button type="button" class="clue' + (struck ? ' is-struck' : '') + '" data-clue="' + ci + '" aria-pressed="' + struck + '">' +
        '<span class="clue-text">' + esc(cl.text) + '</span>' +
        '<span class="clue-by">— ' + esc(cl.witness || 'Anonym') + '</span></button></li>';
    });
    return h + '</ul>';
  }

  /* ---------- Darstellung aktualisieren ---------- */

  function occupancy() {
    var occ = fill(G.n * G.n, -1);
    G.place.forEach(function (c, t) { if (c >= 0) occ[c] = t; });
    return occ;
  }

  function computeConflicts() {
    var n = G.n, bad = {}, msgs = [];
    var rows = {}, cols = {};
    G.place.forEach(function (c, t) {
      if (c < 0) return;
      var r = Math.floor(c / n), col = c % n;
      (rows[r] = rows[r] || []).push(t);
      (cols[col] = cols[col] || []).push(t);
      if (G.cells[c].blocked) {
        bad[t] = true;
        var o = FD.OBJECTS[G.cells[c].obj] || {};
        msgs.push(tokenName(t) + ' steht auf ' + (o.dat || 'einem Möbelstück') + ' – da liegt niemand.');
      }
    });
    Object.keys(rows).forEach(function (r) {
      if (rows[r].length > 1) {
        rows[r].forEach(function (t) { bad[t] = true; });
        msgs.push(joinNames(rows[r].map(tokenName)) + ' stehen ' + (rows[r].length === 2 ? 'beide ' : '') + 'in Reihe ' + (+r + 1) + '.');
      }
    });
    Object.keys(cols).forEach(function (c) {
      if (cols[c].length > 1) {
        cols[c].forEach(function (t) { bad[t] = true; });
        msgs.push(joinNames(cols[c].map(tokenName)) + ' stehen ' + (cols[c].length === 2 ? 'beide ' : '') + 'in Spalte ' + COLS[+c] + '.');
      }
    });
    return { bad: bad, msgs: msgs };
  }

  function updateAll(initial) {
    if (!G) return;
    updateBoard();
    updateSide();
    if (!initial) saveProgress();
  }

  function updateBoard() {
    var n = G.n, occ = occupancy();
    var rowUsed = fill(n, false), colUsed = fill(n, false);
    G.place.forEach(function (c) { if (c >= 0) { rowUsed[Math.floor(c / n)] = true; colUsed[c % n] = true; } });
    var conf = computeConflicts();
    G.els.cells.forEach(function (el, i) {
      var cell = G.cells[i];
      var t = occ[i];
      var auto = t < 0 && !cell.blocked && (rowUsed[cell.r] || colUsed[cell.c]);
      var mark = t < 0 && !cell.blocked && G.marks[i];
      el.classList.toggle('has-token', t >= 0);
      el.classList.toggle('is-auto-x', auto && !mark);
      el.classList.toggle('is-marked', !!mark);
      el.tabIndex = i === G.focus ? 0 : -1;

      var slot = el.querySelector('.c-tok');
      var sig = t < 0 ? -1 : t * 2 + (G.hinted[t] ? 1 : 0);
      if (G.prevOcc[i] !== sig) {
        if (t < 0) slot.innerHTML = '';
        else {
          slot.innerHTML = '<span class="token ' + (G.p.tokens[t].kind === 'snack' ? 'is-snack' : 'is-dog') + '" style="--tc:' + tokenColor(t) + '">' +
            '<span class="token-art">' + tokenArt(t) + '</span></span>' +
            (G.hinted[t] ? '<span class="hint-badge" title="Per Tipp gesetzt">' + art('clothespin') + '</span>' : '');
        }
        G.prevOcc[i] = sig;
      }
      var tokEl = slot.firstChild;
      if (tokEl) {
        tokEl.classList.toggle('is-conflict', !!conf.bad[t]);
        tokEl.classList.toggle('is-selected', t === G.selected);
      }

      var o = cell.obj ? FD.OBJECTS[cell.obj] : null;
      var parts = ['Reihe ' + (cell.r + 1), 'Spalte ' + COLS[cell.c], roomName(cell.room)];
      if (o) parts.push(o.name + (cell.blocked ? ', blockiert' : ''));
      if (t >= 0) parts.push('belegt von ' + tokenName(t) + (conf.bad[t] ? ', Konflikt' : ''));
      else if (mark) parts.push('mit × markiert');
      else if (auto) parts.push('ausgeschlossen');
      else if (!cell.blocked) parts.push('frei');
      el.setAttribute('aria-label', parts.join(', '));
    });
  }

  function updateSide() {
    var placedCount = 0;
    G.place.forEach(function (c) { if (c >= 0) placedCount++; });
    var all = placedCount === G.place.length;

    G.els.cards.forEach(function (card) {
      var t = +card.getAttribute('data-t');
      var sel = t === G.selected;
      card.classList.toggle('is-selected', sel);
      card.classList.toggle('is-placed', G.place[t] >= 0);
      var head = card.querySelector('.dcard-head');
      head.setAttribute('aria-pressed', String(sel));
      head.setAttribute('aria-label', tokenName(t) + (G.place[t] >= 0 ? ', gesetzt auf ' + cellName(G.place[t]) : ', noch auf der Hand') + (sel ? ', ausgewählt' : ''));
    });
    G.els.chips.forEach(function (chip) {
      var t = +chip.getAttribute('data-t');
      chip.classList.toggle('is-selected', t === G.selected);
      chip.classList.toggle('is-placed', G.place[t] >= 0);
      chip.setAttribute('aria-pressed', String(t === G.selected));
    });
    G.els.handName.textContent = G.solved ? 'Gelöst!' : (G.mode === 'mark' ? '× setzen' : (G.selected >= 0 ? tokenName(G.selected) : (all ? 'Alle gesetzt' : '')));
    G.els.modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === G.mode)); });
    G.els.root.querySelector('.game').classList.toggle('mode-mark', G.mode === 'mark');

    G.els.undo.disabled = !G.undo.length || G.solved;
    var left = MAX_HINTS - G.hints;
    G.els.hint.disabled = left <= 0 || G.solved;
    G.els.hint.setAttribute('aria-label', 'Tipp – noch ' + left + ' von ' + MAX_HINTS);
    G.els.pins.forEach(function (pin, k) { pin.classList.toggle('used', k >= left); });
    G.els.clear.disabled = G.solved || (placedCount === 0 && !G.marks.some(Boolean));
    G.els.solve.disabled = !all || G.solved;
    G.els.solve.textContent = G.solved ? 'Gelöst!' : 'Fall lösen';

    var st;
    if (G.solved) st = 'Fall gelöst. Der Täter ist überführt.';
    else if (G.mode === 'mark') st = 'Ausschließen: Tippe Felder an, um ein × zu setzen oder zu entfernen.';
    else if (G.selected >= 0) st = 'Ausgewählt: ' + tokenName(G.selected) + ' – tippe auf ein Feld.';
    else if (all) st = 'Alle Figuren stehen. Bereit für „Fall lösen“?';
    else st = 'Wähle eine Figur aus.';
    G.els.status.textContent = st;
  }

  /* ---------- Aktionen ---------- */

  function snapshot() {
    return { place: G.place.slice(), marks: G.marks.slice(), hinted: G.hinted.slice(), selected: G.selected };
  }
  function pushUndo() {
    G.undo.push(snapshot());
    if (G.undo.length > 300) G.undo.shift();
  }
  function undo() {
    if (!G || G.solved || !G.undo.length) return;
    var s = G.undo.pop();
    G.place = s.place; G.marks = s.marks; G.hinted = s.hinted; G.selected = s.selected;
    updateAll();
  }

  function nextUnplaced(from) {
    var T = G.place.length;
    for (var k = 1; k <= T; k++) {
      var t = (from + k + T) % T;
      if (from < 0) t = k - 1;
      if (G.place[t] < 0) return t;
    }
    return -1;
  }

  function selectToken(t, fromCard) {
    if (!G || G.solved) return;
    if (t < 0 || t >= G.place.length) return;
    G.selected = t;
    G.mode = 'place';
    updateSide();
    updateBoard();
    if (fromCard && window.matchMedia && window.matchMedia('(max-width: 899px)').matches) {
      var rect = G.els.frame.getBoundingClientRect();
      if (rect.top < -rect.height * 0.35 || rect.top > window.innerHeight - 120) {
        G.els.frame.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    }
  }

  function toggleMark(i) {
    var cell = G.cells[i];
    if (cell.blocked) { toast('Da steht ' + ((FD.OBJECTS[cell.obj] || {}).dat || 'ein Möbelstück') + ' – das Feld ist ohnehin tabu.'); return; }
    if (G.place.indexOf(i) >= 0) { toast('Hier liegt schon ' + tokenName(G.place.indexOf(i)) + '.'); return; }
    pushUndo();
    G.marks[i] = !G.marks[i];
    updateAll();
  }

  function actOnCell(i, forceMark) {
    if (!G || G.solved) return;
    setFocus(i, false);
    if (forceMark || G.mode === 'mark') { toggleMark(i); return; }
    var cell = G.cells[i];
    if (cell.blocked) {
      var o = FD.OBJECTS[cell.obj] || {};
      toast('Auf ' + (o.dat || 'diesem Möbelstück') + ' kann niemand liegen.');
      return;
    }
    var occ = G.place.indexOf(i);
    var sel = G.selected;
    if (sel < 0) {
      if (occ >= 0) selectToken(occ);
      else toast('Wähle zuerst eine Figur aus – im Dossier oder mit den Tasten 1–' + G.place.length + '.');
      return;
    }
    pushUndo();
    if (occ === sel) {
      G.place[sel] = -1;
      G.hinted[sel] = false;
    } else {
      if (occ >= 0) { G.place[occ] = -1; G.hinted[occ] = false; }
      G.place[sel] = i;
      G.hinted[sel] = false;
      G.marks[i] = false;
      G.selected = nextUnplaced(sel);
    }
    updateAll();
    if (G.place.every(function (c) { return c >= 0; })) {
      var conf = computeConflicts();
      if (conf.msgs.length) toast(conf.msgs[0], 'bad');
    }
  }

  function removeAt(i) {
    if (!G || G.solved) return;
    var t = G.place.indexOf(i);
    if (t < 0) {
      if (G.marks[i]) { pushUndo(); G.marks[i] = false; updateAll(); }
      return;
    }
    pushUndo();
    G.place[t] = -1;
    G.hinted[t] = false;
    G.selected = t;
    updateAll();
  }

  function setMode(m) {
    if (!G || G.solved) return;
    G.mode = m;
    updateSide();
  }

  function useHint() {
    if (!G || G.solved) return;
    if (G.hints >= MAX_HINTS) { toast('Keine Wäscheklammern mehr. Ab jetzt nur noch Nase.'); return; }
    var sol = G.p.solution;
    var wrong = -1;
    for (var t = 0; t < G.place.length; t++) {
      if (G.place[t] >= 0 && G.place[t] !== sol[t]) { wrong = t; break; }
    }
    if (wrong >= 0) {
      pushUndo();
      G.place[wrong] = -1;
      G.hinted[wrong] = false;
      G.selected = wrong;
      G.hints++;
      updateAll();
      toast(tokenName(wrong) + ' stand falsch – zurück auf die Hand.', 'hint');
      return;
    }
    var u = nextUnplaced(-1);
    if (u < 0) { toast('Alles richtig platziert – jetzt „Fall lösen“ drücken!', 'good'); return; }
    pushUndo();
    var target = sol[u];
    var other = G.place.indexOf(target);
    if (other >= 0) G.place[other] = -1; // sollte nie passieren, sicher ist sicher
    G.place[u] = target;
    G.marks[target] = false;
    G.hinted[u] = true;
    G.hints++;
    G.selected = nextUnplaced(u);
    updateAll();
    toast('Tipp: ' + tokenName(u) + ' gehört nach ' + cellName(target) + '.', 'hint');
  }

  function armClear() {
    if (!G || G.solved) return;
    var btn = G.els.clear;
    if (G.clearArmed) {
      clearTimeout(G.clearArmed);
      G.clearArmed = null;
      btn.classList.remove('is-armed');
      btn.textContent = 'Leeren';
      pushUndo();
      G.place = fill(G.place.length, -1);
      G.marks = fill(G.marks.length, false);
      G.hinted = fill(G.hinted.length, false);
      G.selected = 0;
      updateAll();
      toast('Tatort geräumt. Rückgängig geht noch.');
      return;
    }
    btn.classList.add('is-armed');
    btn.textContent = 'Wirklich alles leeren?';
    G.clearArmed = setTimeout(function () {
      if (!G) return;
      G.clearArmed = null;
      btn.classList.remove('is-armed');
      btn.textContent = 'Leeren';
    }, 3000);
  }

  function checkSolution() {
    if (!G || G.solved) return;
    if (G.place.some(function (c) { return c < 0; })) { toast('Erst alle Figuren setzen.'); return; }
    var sol = G.p.solution;
    var correct = G.place.every(function (c, t) { return c === sol[t]; });
    if (correct) { win(); return; }
    var conf = computeConflicts();
    var frame = G.els.frame;
    frame.classList.remove('shake');
    void frame.offsetWidth;
    frame.classList.add('shake');
    toast('Das riecht falsch. ' + (conf.msgs.length ? conf.msgs[0] : 'Mindestens eine Figur steht nicht richtig.'), 'bad');
  }

  function win() {
    pauseTimer();
    G.solved = true;
    var time = G.elapsed;
    if (G.key) {
      var all = getSolved();
      var prev = all[G.key];
      if (!prev || time < prev.time) all[G.key] = { time: time, hints: G.hints, at: Date.now() };
      save('solved', all);
      drop('progress:' + G.key);
    }
    G.selected = -1;
    updateBoard();
    updateSide();
    showReveal(time);
  }

  /* ---------- Auflösung ---------- */

  function nextTarget() {
    if (!G) return null;
    if (!G.key) return { label: 'Noch ein Zufallsfall', random: true };
    var cases = FD.CASES || [];
    var solved = getSolved();
    var idx = cases.map(function (c) { return c.id; }).indexOf(G.key);
    for (var k = 1; k <= cases.length; k++) {
      var c = cases[(idx + k) % cases.length];
      if (!solved[c.id]) return { label: 'Nächster Fall', hash: '#' + c.id };
    }
    return { label: 'Zufallsfall würfeln', hash: '#zufall' };
  }

  function showReveal(time) {
    closeReveal();
    var p = G.p;
    var culprit = p.culprit;
    var nx = nextTarget();
    var clouds = '';
    var spots = [
      ['-8%', '-6%', '-60vw', '-40vh', '-40deg', 34],
      ['30%', '-12%', '0', '-60vh', '20deg', 30],
      ['68%', '-8%', '60vw', '-40vh', '35deg', 36],
      ['76%', '34%', '70vw', '0', '-25deg', 30],
      ['66%', '72%', '60vw', '50vh', '30deg', 38],
      ['26%', '78%', '0', '60vh', '-20deg', 32],
      ['-10%', '66%', '-60vw', '50vh', '25deg', 36],
      ['-14%', '28%', '-70vw', '0', '-30deg', 28]
    ];
    spots.forEach(function (s, k) {
      clouds += '<div class="rcloud" style="left:' + s[0] + ';top:' + s[1] + ';--fx:' + s[2] + ';--fy:' + s[3] + ';--fr:' + s[4] +
        ';--w:' + s[5] + 'vmax;animation-delay:' + (k * 0.06).toFixed(2) + 's"><div class="rcloud-bob" style="animation-delay:' + (k * 0.3).toFixed(1) + 's">' + art('cloud', k % 3) + '</div></div>';
    });
    var ov = document.createElement('div');
    ov.className = 'reveal';
    ov.style.setProperty('--lvl', LEVEL_VAR[p.level] || 'var(--gas)');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-labelledby', 'reveal-title');
    ov.innerHTML = '<div class="reveal-tint" data-close-reveal></div>' +
      '<div class="reveal-clouds" aria-hidden="true">' + clouds + '</div>' +
      '<div class="reveal-card">' +
      '<div class="reveal-band">' + (p.no ? 'FALL ' + pad2(p.no) : 'ZUFALLSFALL') + ' · ' + esc(p.title) + '</div>' +
      '<h2 id="reveal-title" class="reveal-title">ÜBERFÜHRT!</h2>' +
      '<div class="reveal-hero">' +
      '<span class="burst burst-ink" style="clip-path:' + starPolygon(14, 50, 44, 34) + '"></span>' +
      '<span class="burst burst-fill" style="clip-path:' + starPolygon(14, 50, 44, 34) + '"></span>' +
      '<span class="reveal-portrait" style="--tc:' + tokenColor(culprit) + '">' + tokenArt(culprit, 'guilty') + '</span>' +
      '<span class="pfff" aria-hidden="true">PFFFRRRT!</span>' +
      '</div>' +
      '<p class="reveal-name">' + esc(tokenName(culprit)) + '</p>' +
      '<p class="verdict">' + esc(p.verdict) + '</p>' +
      '<dl class="reveal-stats"><div><dt>Zeit</dt><dd>' + fmtTime(time) + '</dd></div>' +
      '<div><dt>Tipps</dt><dd>' + G.hints + ' / ' + MAX_HINTS + '</dd></div></dl>' +
      '<div class="reveal-actions">' +
      '<button type="button" class="btn btn-primary btn-big" data-reveal-next>' + esc(nx.label) + '</button>' +
      '<a class="btn" href="#akten">Zu den Akten</a>' +
      '<button type="button" class="btn btn-ghost" data-close-reveal>Tatort ansehen</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    document.body.classList.add('has-reveal');
    ov.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-reveal]')) { closeReveal(); return; }
      if (e.target.closest('[data-reveal-next]')) {
        closeReveal();
        if (nx.random) {
          pendingRandom = { n: p.n, level: p.level, seed: Date.now() };
          go('#zufall');
        } else go(nx.hash);
      }
      if (e.target.closest('a[href="#akten"]')) closeReveal();
    });
    setTimeout(function () {
      var b = ov.querySelector('[data-reveal-next]');
      if (b) b.focus({ preventScroll: true });
    }, reducedMotion() ? 50 : 900);
  }

  function closeReveal() {
    var ov = document.querySelector('.reveal');
    if (ov) ov.parentNode.removeChild(ov);
    document.body.classList.remove('has-reveal');
  }

  /* ---------- Eingaben ---------- */

  function setFocus(i, move) {
    if (!G) return;
    var prev = G.els.cells[G.focus];
    if (prev) prev.tabIndex = -1;
    G.focus = i;
    var el = G.els.cells[i];
    if (el) {
      el.tabIndex = 0;
      if (move) el.focus();
    }
  }

  function onBoardClick(e) {
    var cell = e.target.closest('.cell');
    if (!cell || !G) return;
    actOnCell(+cell.getAttribute('data-i'), e.shiftKey);
  }
  function onBoardContext(e) {
    var cell = e.target.closest('.cell');
    if (!cell || !G) return;
    e.preventDefault();
    if (G.solved) return;
    var i = +cell.getAttribute('data-i');
    setFocus(i, false);
    toggleMark(i);
  }
  function onBoardKey(e) {
    if (!G) return;
    var n = G.n, i = G.focus, r = Math.floor(i / n), c = i % n;
    var k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
      if (k === 'ArrowUp') r = Math.max(0, r - 1);
      if (k === 'ArrowDown') r = Math.min(n - 1, r + 1);
      if (k === 'ArrowLeft') c = Math.max(0, c - 1);
      if (k === 'ArrowRight') c = Math.min(n - 1, c + 1);
      e.preventDefault();
      setFocus(r * n + c, true);
    } else if (k === 'Home' || k === 'End') {
      e.preventDefault();
      setFocus(r * n + (k === 'Home' ? 0 : n - 1), true);
    } else if (k === 'Backspace' || k === 'Delete') {
      e.preventDefault();
      removeAt(i);
    } else if ((k === 'Enter' || k === ' ') && e.shiftKey) {
      e.preventDefault();
      actOnCell(i, true);
    }
  }

  function onGlobalKey(e) {
    var reveal = document.querySelector('.reveal');
    if (reveal) {
      if (e.key === 'Escape') { e.preventDefault(); closeReveal(); }
      return;
    }
    if (rulesOpen() || !G) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable)) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-9]$/.test(e.key)) {
      var t = +e.key - 1;
      if (t < G.place.length) { e.preventDefault(); selectToken(t); }
    } else if (e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      setMode(G.mode === 'mark' ? 'place' : 'mark');
    }
  }

  function onAppClick(e) {
    var tgt = e.target;
    var a = tgt.closest('[data-action]');
    if (a) {
      var act = a.getAttribute('data-action');
      if (act === 'rules') openRules();
      else if (act === 'undo') undo();
      else if (act === 'hint') useHint();
      else if (act === 'clear') armClear();
      else if (act === 'solve') checkSolution();
      else if (act === 'roll') rollRandom();
      return;
    }
    var sc = tgt.closest('[data-scroll]');
    if (sc) {
      var target = document.getElementById(sc.getAttribute('data-scroll'));
      if (target) target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (!G) return;
    var m = tgt.closest('[data-mode]');
    if (m) { setMode(m.getAttribute('data-mode')); return; }
    var clue = tgt.closest('.clue');
    if (clue) {
      var ci = +clue.getAttribute('data-clue');
      G.struck[ci] = !G.struck[ci];
      if (!G.struck[ci]) delete G.struck[ci];
      clue.classList.toggle('is-struck', !!G.struck[ci]);
      clue.setAttribute('aria-pressed', String(!!G.struck[ci]));
      saveProgress();
      return;
    }
    var chip = tgt.closest('.hand-chip');
    if (chip) { selectToken(+chip.getAttribute('data-t'), true); return; }
    var card = tgt.closest('.dcard[data-t]');
    if (card) selectToken(+card.getAttribute('data-t'), true);
  }

  function rollRandom() {
    var nEl = $app.querySelector('input[name="rnd-n"]:checked');
    var lEl = $app.querySelector('input[name="rnd-l"]:checked');
    var n = nEl ? +nEl.value : 6;
    var level = lEl ? +lEl.value : 2;
    save('random', { n: n, level: level });
    pendingRandom = { n: n, level: level, seed: Date.now() };
    go('#zufall');
  }

  var scrollQueued = false;
  function onScroll() {
    if (scrollQueued || !G || !G.els.hand) return;
    scrollQueued = true;
    window.requestAnimationFrame(function () {
      scrollQueued = false;
      if (!G || !G.els.hand) return;
      var stuck = getComputedStyle(G.els.hand).position === 'sticky' && G.els.hand.getBoundingClientRect().top <= 0.5 &&
        G.els.frame.getBoundingClientRect().bottom < 0;
      G.els.hand.classList.toggle('is-stuck', stuck);
    });
  }

  /* ---------- Start ---------- */

  function boot() {
    FD = globalThis.Fartdoku || globalThis.FD || null;
    $app = document.getElementById('app');
    $toasts = document.getElementById('toasts');
    $rules = document.getElementById('rules-dialog');
    if (!FD || !FD.CASES || typeof FD.getCase !== 'function') {
      $app.innerHTML = '<main class="wrap loading"><div class="loading-card"><p>Die Spieldaten fehlen. Irgendwas stinkt hier gewaltig.</p></div></main>';
      return;
    }
    globalThis.FD = globalThis.FD || FD;

    $app.addEventListener('click', onAppClick);
    document.addEventListener('keydown', onGlobalKey);
    if ($rules) {
      $rules.addEventListener('click', function (e) {
        if (e.target === $rules || e.target.closest('[data-close]')) closeRules();
      });
      $rules.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && typeof $rules.showModal !== 'function') closeRules();
      });
    }
    document.addEventListener('visibilitychange', function () {
      if (!G) return;
      if (document.hidden) { pauseTimer(); saveProgress(); } else startTimer();
    });
    window.addEventListener('pagehide', function () { if (G) { pauseTimer(); saveProgress(); } });
    window.addEventListener('hashchange', route);
    window.addEventListener('scroll', onScroll, { passive: true });
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
