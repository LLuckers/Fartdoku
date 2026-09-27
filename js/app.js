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

  var MODES = ['note', 'place', 'mark'];
  var HOLD_MS = 400;     // so lange halten = Setzen
  var HOLD_SHOW = 90;    // ab hier erscheint der Gasring (kurze Taps flackern nicht)
  var MOVE_TOL = 10;     // Finger weiter bewegt = abgebrochen
  var DBL_MS = 320;      // Doppeltipp-Fenster
  var MOBILE_MQ = '(max-width: 759px)';

  var G = null;              // aktueller Spielzustand
  var routeSeq = 0;          // schützt vor veralteten Ladevorgängen
  var pendingRandom = null;  // {n, level, seed} für #zufall
  var lastToast = { msg: '', at: 0 };

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
  function isMobile() {
    try { return window.matchMedia(MOBILE_MQ).matches; } catch (e) { return false; }
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
  function vibrate(ms) {
    try {
      var ua = navigator.userActivation;
      if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(ms);
    } catch (e) { /* egal */ }
  }
  /* Dunkle Figurenfarben (z. B. Leias Blau) bekommen weiße Schrift auf Notiz-Punkten. */
  function textOn(color) {
    var m = /^#([0-9a-f]{6})$/i.exec(String(color || ''));
    if (!m) return 'var(--ink)';
    var v = parseInt(m[1], 16);
    var r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 120 ? '#fff' : 'var(--ink)';
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
    var now = Date.now();
    if (msg === lastToast.msg && now - lastToast.at < 1500) return; // nicht doppelt nerven
    lastToast = { msg: msg, at: now };
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.textContent = msg;
    $toasts.appendChild(el);
    while ($toasts.children.length > 3) $toasts.removeChild($toasts.firstChild);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, kind === 'short' ? 1800 : 3400);
  }

  function announce(msg) {
    if (!G || !G.els.live) return;
    G.els.live.textContent = '';
    setTimeout(function () { if (G && G.els.live) G.els.live.textContent = msg; }, 30);
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
      '<div class="rules-controls"><p><b>Bedienung:</b> Figur wählen (in der Leiste, im Dossier oder mit den Tasten 1–9), dann:</p>' +
      '<ul>' +
      '<li><b>Tippen = Notiz.</b> Ein kleiner Farbpunkt merkt sich, wo die Figur sein <i>könnte</i>. Pro Feld passen alle Figuren.</li>' +
      '<li><b>Halten = Setzen.</b> Finger (oder Maus) kurz gedrückt halten, bis die Gaswolke voll ist. Doppeltipp setzt sofort. Halten auf der ausgewählten Figur nimmt sie wieder weg.</li>' +
      '<li><b>Autopilot:</b> Beim Setzen verschwinden alle Notizen dieser Figur und alle Notizen in ihrer Reihe und Spalte.</li>' +
      '<li><b>Spürnase:</b> Die Notizfelder der gewählten Figur leuchten. Bleibt nur noch ein Feld übrig, zeigt ihr Chip ein „!“.</li>' +
      '<li><b>Modi:</b> „Setzen“ setzt schon beim Tippen, „×“ streicht Felder aus. Rechtsklick oder Shift-Klick setzt ebenfalls ein ×.</li>' +
      '<li><b>Tastatur:</b> Pfeiltasten bewegen, Leertaste = Notiz, Enter = Setzen, Entf = Entfernen, X wechselt den Modus, Strg+Z macht rückgängig.</li>' +
      '</ul></div>';
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

  function guestBandHTML(guest) {
    return '<span class="guest-band" aria-hidden="true">' +
      '<span class="guest-crawl"><span class="guest-kicker">Gastauftritt</span>' +
      '<span class="guest-name">' + esc(guest.name) + '</span></span>' +
      '<span class="guest-face" style="--dog:' + esc(guest.color) + '">' + art('frenchie', guest.id, { mood: 'normal' }) + '</span>' +
      '</span>';
  }

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
      var guest = c.guest ? dogById(c.guest) : null;
      var tilt = (i % 2 ? 1.5 : -1.5) * (i % 3 === 2 ? 0.6 : 1);
      h += '<a class="case-card' + (s ? ' is-solved' : '') + (guest ? ' is-guest' : '') + '" href="#' + c.id + '" style="--tilt:' + tilt + 'deg;--lvl:' + LEVEL_VAR[c.level] + '"' +
        ' aria-label="Fall ' + pad2(c.no) + ': ' + esc(c.title) + ', ' + esc(levelName(c.level)) + ', ' + c.n + ' mal ' + c.n +
        (guest ? ', mit Gastauftritt von ' + esc(guest.name) : '') + (s ? ', gelöst in ' + fmtTime(s.time) : '') + '">' +
        '<span class="case-band"><span class="case-no">FALL ' + pad2(c.no) + '</span><span class="case-size">' + c.n + '×' + c.n + '</span></span>' +
        '<span class="case-body">' +
        '<span class="case-snack" aria-hidden="true">' + art('snack', c.snack) + '</span>' +
        '<span class="case-title">' + esc(c.title) + '</span>' +
        '<span class="case-level">' + cloudPips(c.level, 4) + '<span>' + esc(levelName(c.level)) + '</span></span>' +
        '</span>' +
        (guest ? guestBandHTML(guest) : '') +
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
      h += '<article class="dog-card' + (d.guest ? ' is-guest' : '') + '" style="--dog:' + esc(d.color) + ';--dog-tx:' + textOn(d.color) + ';--tilt:' + (i % 2 ? 1 : -1) + 'deg">' +
        (d.guest ? '<span class="guest-badge"><span aria-hidden="true">★ </span>Gaststar</span>' : '') +
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

  function loadMode() {
    var m = load('mode');
    return MODES.indexOf(m) >= 0 ? m : 'note';
  }

  function startGame(puzzle, key) {
    var n = puzzle.n;
    var T = puzzle.tokens.length;
    G = {
      p: puzzle, key: key, n: n,
      cells: puzzle.board.cells,
      place: fill(T, -1),
      marks: fill(n * n, false),
      notes: fill(n * n, 0),          // Bitmaske je Feld: Bit t = Notiz für Figur t
      hinted: fill(T, false),
      struck: {},
      selected: 0,
      view: 0,                        // was der Spotlight zeigt: Figur-Index oder 'gen'
      mode: loadMode(),
      undo: [],
      elapsed: 0, running: false, t0: 0, tick: null,
      hints: 0,
      solved: false,
      focus: 0,
      clearArmed: null,
      prevOcc: fill(n * n, -2),
      prevNotes: fill(n * n, -1),
      lone: fill(T, false),
      press: null, lastTap: null, lastPtr: 0, lastPtrType: '', kbdAt: 0, swipedAt: 0,
      bounce: -1, spotSig: '', spotView: null,
      sheetCollapsed: load('sheet') === 'collapsed',
      groups: groupClues(puzzle),
      els: {}
    };
    if (key) restoreProgress();
    var s = key ? getSolved()[key] : null;
    G.prevSolved = s || null;
    G.selected = nextUnplaced(-1);
    G.view = G.selected >= 0 ? G.selected : 0;
    renderGame();
    updateAll(true);
    startTimer();
    maybeCoach();
  }

  function fill(len, v) { var a = []; for (var i = 0; i < len; i++) a.push(v); return a; }

  function groupClues(p) {
    var byT = {}, general = [];
    p.clues.forEach(function (cl, ci) {
      if (cl.subject == null || cl.subject < 0 || cl.subject >= p.tokens.length) general.push(ci);
      else (byT[cl.subject] = byT[cl.subject] || []).push(ci);
    });
    return { byT: byT, general: general };
  }

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
    // Notizen gibt es erst ab v2 – ältere Spielstände laden einfach ohne.
    if (Array.isArray(pr.notes) && pr.notes.length === N) {
      var mask = (1 << G.place.length) - 1;
      G.notes = pr.notes.map(function (v, i) { return G.cells[i].blocked ? 0 : ((+v | 0) & mask); });
    }
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
      v: 2, place: G.place, marks: marks, notes: G.notes, hinted: G.hinted, struck: G.struck,
      elapsed: elapsedNow(), hints: G.hints
    });
  }

  function leaveGame() {
    if (!G) return;
    if (G.els.coach) {
      document.removeEventListener('pointerdown', dismissCoach, true);
      document.removeEventListener('keydown', dismissCoach, true);
    }
    pauseTimer();
    saveProgress();
    clearTimeout(G.clearArmed);
    endPress(true);
    if (G.ro) { try { G.ro.disconnect(); } catch (e) { /* egal */ } }
    document.documentElement.style.setProperty('--sheet-h', '0px');
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
  function tokenInitial(t) {
    if (!G.initials) {
      // Anfangsbuchstabe; bei Doppelungen (Prinzessin Leia vs. Pierre) den des letzten Namensteils nehmen.
      var words = G.p.tokens.map(function (tok) { return String(tok.name || '?').split(/\s+/); });
      var first = words.map(function (w) { return w[0].charAt(0).toUpperCase(); });
      G.initials = G.p.tokens.map(function (tok, u) {
        if (tok.kind === 'snack') return '★';
        var dup = first.some(function (f, v) { return v !== u && G.p.tokens[v].kind !== 'snack' && f === first[u]; });
        if (dup && words[u].length > 1) {
          var alt = words[u][words[u].length - 1].charAt(0).toUpperCase();
          if (first.indexOf(alt) < 0) return alt;
        }
        return first[u];
      });
    }
    return G.initials[t];
  }
  function tokenSub(t) {
    var tok = G.p.tokens[t];
    if (tok.kind === 'snack') return SNACK_SUB;
    var dog = dogById(tok.id);
    return dog ? dog.title : 'Verdächtiger';
  }
  function cellName(i) { var n = G.n; return COLS[i % n] + (Math.floor(i / n) + 1); }
  function roomName(key) { return (FD.ROOMS[key] || {}).name || key; }
  function noteCols() { return G.p.tokens.length <= 4 ? 2 : 3; }

  function renderGame() {
    var p = G.p, n = G.n, T = p.tokens.length;
    var caseLabel = p.no ? 'FALL ' + pad2(p.no) : 'ZUFALLSFALL';
    document.title = (p.no ? 'Fall ' + pad2(p.no) : 'Zufallsfall') + ': ' + p.title + ' – Fartdoku';
    var nc = noteCols();

    var h = '<main class="game wrap mode-' + G.mode + (G.sheetCollapsed ? ' sheet-collapsed' : '') + '" style="--lvl:' + LEVEL_VAR[p.level] + '">';
    h += '<div class="topbar">' +
      '<a class="btn btn-small btn-back" href="#akten" aria-label="Zu den Akten"><span aria-hidden="true">←</span><span class="lbl-long" aria-hidden="true"> Zu den Akten</span></a>' +
      '<h1 class="game-title"><span class="game-no">' + caseLabel + '</span> · ' + esc(p.title) + '</h1>' +
      '<span class="chip">' + esc(p.levelName || levelName(p.level)) + '</span>' +
      '<span class="timer" role="timer" aria-label="Verstrichene Zeit">00:00</span>' +
      '<button type="button" class="btn btn-icon" data-action="rules" aria-label="Regeln anzeigen">?</button>' +
      '</div>';

    h += '<section class="akte" aria-label="Die Akte">' +
      '<span class="akte-pin" aria-hidden="true">' + art('clothespin') + '</span>' +
      '<span class="akte-label">Die Akte' + (p.mapName ? ' · ' + esc(p.mapName) : '') +
      '<span class="akte-lvl"> · ' + esc(p.levelName || levelName(p.level)) + '</span></span>' +
      '<p class="akte-story" id="akte-story">' + esc(p.story) + '</p>' +
      '<button type="button" class="akte-more" data-action="akte" aria-expanded="false" aria-controls="akte-story">mehr</button>' +
      (G.prevSolved ? '<p class="akte-solved">Bereits gelöst in ' + fmtTime(G.prevSolved.time) + '. Nochmal schnüffeln schadet nie.</p>' : '') +
      '</section>';

    h += '<div class="game-cols">';

    // Brett
    h += '<section class="board-col" aria-label="Tatort">';
    h += '<div class="board-frame' + (n <= 6 ? ' fit' : '') + '" style="--n:' + n + ';--nc:' + nc + ';--nr:' + Math.ceil(T / nc) + '">' +
      '<div class="compass" aria-hidden="true"><span class="compass-arrow">▲</span>N</div>' +
      '<div class="board-grid">' +
      '<span class="corner" aria-hidden="true"><span class="mini-compass"><span class="compass-arrow">▲</span>N</span></span>' +
      '<div class="col-labels" aria-hidden="true">';
    for (var c = 0; c < n; c++) h += '<span>' + COLS[c] + '</span>';
    h += '</div><div class="row-labels" aria-hidden="true">';
    for (var r = 0; r < n; r++) h += '<span>' + (r + 1) + '</span>';
    h += '</div>';
    h += '<div class="board" role="group" aria-label="Spielbrett ' + n + ' mal ' + n + '">' + boardCellsHTML() + '</div>';
    h += '</div><div class="board-fx" aria-hidden="true"></div></div>';

    // Figurenleiste + Spotlight (auf dem Handy als Bottom-Sheet)
    var hasGen = G.groups.general.length > 0;
    h += '<section class="sheet" aria-label="Figuren und Aussagen">' +
      '<button type="button" class="sheet-grab" data-action="sheet" aria-expanded="' + !G.sheetCollapsed + '" aria-label="Aussagen ein- oder ausklappen">' +
      '<span class="grab-bar" aria-hidden="true"></span><span class="grab-label" aria-hidden="true">Aussagen zeigen</span></button>' +
      '<div class="hand" role="group" aria-label="Figuren" style="--count:' + (T + (hasGen ? 1 : 0)) + '">';
    p.tokens.forEach(function (tok, t) {
      h += '<button type="button" class="hand-chip' + (tok.kind === 'snack' ? ' is-snack' : '') + '" data-t="' + t + '" style="--tc:' + tokenColor(t) + '">' +
        '<span class="hand-art" aria-hidden="true">' + tokenArt(t) + '</span>' +
        '<span class="hand-key" aria-hidden="true">' + (t + 1) + '</span>' +
        '<span class="hand-coord" aria-hidden="true"></span>' +
        '<span class="hand-lone" aria-hidden="true" title="Nur noch ein Feld übrig">!</span>' +
        '<span class="hand-label" aria-hidden="true">' + esc(tok.name) + '</span></button>';
    });
    if (hasGen) {
      h += '<button type="button" class="hand-chip is-gen" data-view="gen" aria-label="Weitere Beweise anzeigen">' +
        '<span class="hand-art" aria-hidden="true">' + art('cloud', 0) + '</span>' +
        '<span class="hand-label" aria-hidden="true">Weitere Beweise</span></button>';
    }
    h += '</div><div class="spot"></div></section>';

    // Werkzeuge
    h += '<div class="toolbar">' +
      '<div class="mode-toggle" role="group" aria-label="Modus">' +
      '<button type="button" data-mode="note" aria-pressed="false" aria-label="Modus Notiz: Tippen notiert, Halten setzt">' +
      '<span class="mode-main" aria-hidden="true"><span class="mode-ico">✎</span>Notiz</span><span class="mode-sub" aria-hidden="true">Halten = Setzen</span></button>' +
      '<button type="button" data-mode="place" aria-pressed="false" aria-label="Modus Setzen: Tippen setzt direkt">' +
      '<span class="mode-main" aria-hidden="true"><span class="mode-ico mode-dot"></span>Setzen</span><span class="mode-sub" aria-hidden="true">Tippen setzt</span></button>' +
      '<button type="button" data-mode="mark" aria-pressed="false" aria-label="Modus Kreuz: Tippen setzt oder entfernt ein ×">' +
      '<span class="mode-main" aria-hidden="true"><span class="mode-x">×</span></span><span class="mode-sub" aria-hidden="true">Ausschließen</span></button>' +
      '</div>' +
      '<div class="tool-row">' +
      '<button type="button" class="btn btn-undo" data-action="undo" aria-label="Rückgängig" title="Rückgängig (Strg+Z)"><span aria-hidden="true">↶</span></button>' +
      '<button type="button" class="btn btn-hint" data-action="hint"><span>Tipp</span><span class="pins" aria-hidden="true">' +
      pinHTML() + pinHTML() + pinHTML() + '</span></button>' +
      '<button type="button" class="btn btn-clear" data-action="clear">Leeren</button>' +
      '<button type="button" class="btn btn-primary btn-solve" data-action="solve"></button>' +
      '</div></div>' +
      '<p class="status"></p>' +
      '<p class="sr-only" role="status" aria-live="polite" data-live></p>';
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
      game: root.querySelector('.game'),
      timer: root.querySelector('.timer'),
      board: root.querySelector('.board'),
      frame: root.querySelector('.board-frame'),
      fx: root.querySelector('.board-fx'),
      cells: Array.prototype.slice.call(root.querySelectorAll('.cell')),
      cards: Array.prototype.slice.call(root.querySelectorAll('.dcard[data-t]')),
      chips: Array.prototype.slice.call(root.querySelectorAll('.hand-chip[data-t]')),
      genChip: root.querySelector('.hand-chip.is-gen'),
      hand: root.querySelector('.hand'),
      sheet: root.querySelector('.sheet'),
      grab: root.querySelector('.sheet-grab'),
      spot: root.querySelector('.spot'),
      modeBtns: Array.prototype.slice.call(root.querySelectorAll('[data-mode]')),
      undo: root.querySelector('[data-action="undo"]'),
      hint: root.querySelector('[data-action="hint"]'),
      pins: Array.prototype.slice.call(root.querySelectorAll('.pins .pin')),
      clear: root.querySelector('[data-action="clear"]'),
      solve: root.querySelector('[data-action="solve"]'),
      status: root.querySelector('.status'),
      live: root.querySelector('[data-live]')
    };
    G.els.noteBoxes = G.els.cells.map(function (el) { return el.querySelector('.c-notes'); });
    G.els.tokBoxes = G.els.cells.map(function (el) { return el.querySelector('.c-tok'); });

    var board = G.els.board;
    board.addEventListener('pointerdown', onBoardPointerDown);
    board.addEventListener('click', onBoardClick);
    board.addEventListener('contextmenu', onBoardContext);
    board.addEventListener('keydown', onBoardKey);
    board.addEventListener('dragstart', function (e) { e.preventDefault(); });
    board.addEventListener('focusin', function (e) {
      var cell = e.target.closest && e.target.closest('.cell');
      if (cell && G) setFocus(+cell.getAttribute('data-i'), false);
    });
    G.els.spot.addEventListener('pointerdown', onSpotDown);
    watchSheet();
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
      inner += '<span class="c-x" aria-hidden="true">×</span><span class="c-notes" aria-hidden="true"></span><span class="c-tok"></span>';
      h += '<button type="button" class="' + cls.join(' ') + '" data-i="' + i + '" tabindex="-1" style="--room:' +
        esc((FD.ROOMS[cell.room] || {}).color || '#eee') + '"' + (cell.blocked ? ' aria-disabled="true"' : '') + '>' + inner + '</button>';
    });
    return h;
  }

  function dossierHTML() {
    var p = G.p;
    var h = '<h2 class="dossier-title">Dossier</h2>';
    p.tokens.forEach(function (tok, t) {
      h += '<article class="dcard' + (tok.kind === 'snack' ? ' is-snack' : '') + '" data-t="' + t + '" style="--tc:' + tokenColor(t) + '">' +
        '<span class="dcard-tab" aria-hidden="true">Ausgewählt</span>' +
        '<button type="button" class="dcard-head" aria-pressed="false">' +
        '<span class="dcard-portrait" aria-hidden="true">' + tokenArt(t) + '</span>' +
        '<span class="dcard-names"><span class="dcard-name">' + esc(tok.name) + '</span>' +
        '<span class="dcard-sub">' + esc(tokenSub(t)) + '</span>' +
        '<span class="dcard-pills"><span class="pill pill-state" aria-hidden="true"></span>' +
        '<span class="pill pill-lone" aria-hidden="true"><b>!</b> Nur noch ein Feld übrig</span></span></span>' +
        '<span class="dcard-key" aria-hidden="true">' + (t + 1) + '</span>' +
        '<span class="dcard-check" aria-hidden="true">✓</span>' +
        '</button>' + cluesHTML(G.groups.byT[t] || []) + '</article>';
    });
    if (G.groups.general.length) {
      h += '<article class="dcard is-general"><div class="dcard-head dcard-head-static">' +
        '<span class="dcard-portrait" aria-hidden="true">' + art('cloud', 0) + '</span>' +
        '<span class="dcard-names"><span class="dcard-name">Weitere Beweise</span><span class="dcard-sub">Spuren, Messwerte, Gerüchte</span></span>' +
        '</div>' + cluesHTML(G.groups.general) + '</article>';
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

  /* ---------- Spotlight (Handy) ---------- */

  function spotOrder() {
    var o = [];
    for (var t = 0; t < G.place.length; t++) o.push(t);
    if (G.groups.general.length) o.push('gen');
    return o;
  }

  function stateText(t) {
    return G.place[t] >= 0 ? 'gesetzt · ' + cellName(G.place[t]) : 'noch offen';
  }

  function spotHTML(v, dir) {
    var slide = dir ? (dir > 0 ? ' slide-next' : ' slide-prev') : '';
    var nav = function (d, label, sym) {
      return '<button type="button" class="spot-nav" data-action="' + (d < 0 ? 'spot-prev' : 'spot-next') + '" aria-label="' + label + '">' + sym + '</button>';
    };
    if (v === 'gen') {
      return '<article class="spot-card is-general' + slide + '" style="--tc:var(--gas)">' +
        '<div class="spot-head">' + nav(-1, 'Vorherige Karte', '‹') +
        '<span class="spot-portrait" aria-hidden="true">' + art('cloud', 0) + '</span>' +
        '<div class="spot-names"><h2 class="spot-name">Weitere Beweise</h2><span class="spot-sub">Spuren, Messwerte, Gerüchte</span></div>' +
        nav(1, 'Nächste Karte', '›') + '</div>' +
        cluesHTML(G.groups.general) + '</article>';
    }
    var t = v;
    var tok = G.p.tokens[t];
    var placed = G.place[t] >= 0;
    return '<article class="spot-card' + (tok.kind === 'snack' ? ' is-snack' : '') + (t === G.selected ? ' is-selected' : '') + slide + '" style="--tc:' + tokenColor(t) + '">' +
      '<div class="spot-head">' + nav(-1, 'Vorherige Figur', '‹') +
      '<span class="spot-portrait" aria-hidden="true">' + tokenArt(t) + '</span>' +
      '<div class="spot-names"><h2 class="spot-name">' + esc(tok.name) + '</h2>' +
      '<span class="spot-sub">' + esc(tokenSub(t)) + '</span>' +
      '<span class="dcard-pills"><span class="pill pill-state' + (placed ? ' is-placed' : '') + '">' + esc(stateText(t)) + '</span>' +
      (G.lone[t] ? '<span class="pill pill-lone is-on"><b>!</b> Nur noch ein Feld übrig</span>' : '') + '</span></div>' +
      nav(1, 'Nächste Figur', '›') + '</div>' +
      cluesHTML(G.groups.byT[t] || []) + '</article>';
  }

  function renderSpot() {
    var spot = G.els.spot;
    if (!spot) return;
    var v = G.view;
    if (v !== 'gen' && (v == null || v < 0 || v >= G.place.length)) v = G.view = 0;
    var sig = v + '|' + (v === 'gen' ? '' : G.place[v] + '|' + G.lone[v] + '|' + (v === G.selected));
    if (sig === G.spotSig) return;
    var dir = 0;
    if (G.spotView !== null && G.spotView !== v) {
      var o = spotOrder();
      var a = o.indexOf(G.spotView), b = o.indexOf(v);
      dir = b > a ? 1 : -1;
      if (a === o.length - 1 && b === 0) dir = 1;
      if (a === 0 && b === o.length - 1) dir = -1;
    }
    G.spotSig = sig;
    G.spotView = v;
    spot.innerHTML = spotHTML(v, dir);
    if (dir) spot.scrollTop = 0;
  }

  function cycleSpot(dir) {
    if (!G) return;
    var o = spotOrder();
    var k = o.indexOf(G.view);
    if (k < 0) k = 0;
    var v = o[(k + dir + o.length) % o.length];
    if (v === 'gen' || G.solved) { G.view = v; updateSide(); }
    else selectToken(v);
  }

  /* Wischen im Spotlight: links/rechts = nächste/vorherige Figur. */
  function onSpotDown(e) {
    if (!G || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var x0 = e.clientX, y0 = e.clientY, id = e.pointerId;
    function up(ev) {
      if (ev.pointerId !== id) return;
      cleanup();
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        G.swipedAt = Date.now();
        cycleSpot(dx < 0 ? 1 : -1);
      }
    }
    function cancel(ev) { if (ev.pointerId === id) cleanup(); }
    function cleanup() {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    }
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  function watchSheet() {
    var sheet = G.els.sheet;
    var set = function () {
      if (!G || G.els.sheet !== sheet) return;
      var fixed = getComputedStyle(sheet).position === 'fixed';
      document.documentElement.style.setProperty('--sheet-h', (fixed ? Math.ceil(sheet.getBoundingClientRect().height) : 0) + 'px');
    };
    G.sheetSync = set;
    if (typeof ResizeObserver === 'function') {
      G.ro = new ResizeObserver(set);
      G.ro.observe(sheet);
    }
    set();
  }

  function toggleSheet() {
    if (!G) return;
    G.sheetCollapsed = !G.sheetCollapsed;
    save('sheet', G.sheetCollapsed ? 'collapsed' : 'open');
    G.els.game.classList.toggle('sheet-collapsed', G.sheetCollapsed);
    G.els.grab.setAttribute('aria-expanded', String(!G.sheetCollapsed));
    if (G.sheetSync) G.sheetSync();
  }

  /* ---------- Coach-Mark (nur beim ersten Mal) ---------- */

  function maybeCoach() {
    if (!G || G.solved || load('coach')) return;
    var el = document.createElement('div');
    el.className = 'coach';
    el.innerHTML = '<div class="coach-card" role="note">' +
      '<span class="coach-demo" aria-hidden="true"><span class="coach-cell"><span class="coach-dot"></span><span class="coach-ring"></span><span class="coach-finger"></span></span></span>' +
      '<p class="coach-text"><span><b>Tippen</b> = Notiz</span><span class="coach-sep" aria-hidden="true"> · </span><span><b>Halten</b> = Setzen</span></p>' +
      '<button type="button" class="btn btn-small" data-action="coach-ok">Verstanden</button></div>';
    G.els.frame.appendChild(el);
    G.els.coach = el;
    // Erste Interaktion irgendwo (Brett, Leiste, Knopf) schließt den Hinweis.
    document.addEventListener('pointerdown', dismissCoach, true);
    document.addEventListener('keydown', dismissCoach, true);
  }
  function dismissCoach() {
    document.removeEventListener('pointerdown', dismissCoach, true);
    document.removeEventListener('keydown', dismissCoach, true);
    if (!G || !G.els.coach) return;
    var el = G.els.coach;
    G.els.coach = null;
    save('coach', 1);
    el.classList.add('out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
  }

  /* ---------- Darstellung aktualisieren ---------- */

  function occupancy() {
    var occ = fill(G.n * G.n, -1);
    G.place.forEach(function (c, t) { if (c >= 0) occ[c] = t; });
    return occ;
  }

  /* Warum darf Figur t in Feld i keine Notiz bekommen? null = darf. */
  function noteBlock(t, i) {
    var cell = G.cells[i], n = G.n;
    if (cell.blocked) return 'blocked';
    if (G.place.indexOf(i) >= 0) return 'occupied';
    if (G.marks[i]) return 'marked';
    for (var u = 0; u < G.place.length; u++) {
      var c = G.place[u];
      if (u === t || c < 0) continue;
      if (Math.floor(c / n) === cell.r) return { row: u };
      if (c % n === cell.c) return { col: u };
    }
    return null;
  }

  function computeLone() {
    var T = G.place.length;
    G.lone = fill(T, false);
    for (var t = 0; t < T; t++) {
      if (G.place[t] >= 0) continue;
      var bit = 1 << t, cnt = 0;
      for (var i = 0; i < G.notes.length && cnt < 2; i++) {
        if ((G.notes[i] & bit) && !noteBlock(t, i)) cnt++;
      }
      G.lone[t] = cnt === 1;
    }
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
    computeLone();
    updateBoard();
    updateSide();
    if (!initial) saveProgress();
  }

  function notesHTML(mask) {
    var nc = noteCols(), h = '';
    for (var t = 0; t < G.place.length; t++) {
      if (!(mask & (1 << t))) continue;
      var col = tokenColor(t);
      h += '<span class="c-note' + (G.p.tokens[t].kind === 'snack' ? ' is-snack' : '') + '" data-t="' + t + '" style="--tc:' + col + ';--tx:' + textOn(col) +
        ';grid-area:' + (Math.floor(t / nc) + 1) + '/' + (t % nc + 1) + '">' + esc(tokenInitial(t)) + '</span>';
    }
    return h;
  }

  function updateBoard() {
    var n = G.n, occ = occupancy();
    var rowUsed = fill(n, false), colUsed = fill(n, false);
    G.place.forEach(function (c) { if (c >= 0) { rowUsed[Math.floor(c / n)] = true; colUsed[c % n] = true; } });
    var conf = computeConflicts();
    var sel = G.solved ? -1 : G.selected;
    var selBit = sel >= 0 ? 1 << sel : 0;
    G.els.board.setAttribute('data-sel', String(sel));
    if (sel >= 0) G.els.board.style.setProperty('--sc', tokenColor(sel));

    G.els.cells.forEach(function (el, i) {
      var cell = G.cells[i];
      var t = occ[i];
      var auto = t < 0 && !cell.blocked && (rowUsed[cell.r] || colUsed[cell.c]);
      var mark = t < 0 && !cell.blocked && G.marks[i];
      var mask = t < 0 ? G.notes[i] : 0;
      el.classList.toggle('has-token', t >= 0);
      el.classList.toggle('is-auto-x', auto && !mark && !mask);
      el.classList.toggle('is-marked', !!mark);
      el.classList.toggle('has-notes', !!mask);
      el.classList.toggle('is-cand', !!(mask & selBit) && !noteBlock(sel, i));
      el.tabIndex = i === G.focus ? 0 : -1;

      if (G.prevNotes[i] !== mask) {
        G.els.noteBoxes[i].innerHTML = mask ? notesHTML(mask) : '';
        G.prevNotes[i] = mask;
      }

      var slot = G.els.tokBoxes[i];
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
        tokEl.classList.toggle('is-selected', t === sel);
      }

      var o = cell.obj ? FD.OBJECTS[cell.obj] : null;
      var parts = [cellName(i), roomName(cell.room)];
      if (o) parts.push(o.name + (cell.blocked ? ', blockiert' : ''));
      if (t >= 0) parts.push('belegt von ' + tokenName(t) + (conf.bad[t] ? ', Konflikt' : ''));
      else if (mark) parts.push('mit × markiert');
      else if (auto) parts.push('ausgeschlossen');
      else if (!cell.blocked) parts.push('frei');
      if (mask) {
        var names = [];
        for (var u = 0; u < G.place.length; u++) if (mask & (1 << u)) names.push(tokenName(u));
        parts.push('Notizen: ' + names.join(', '));
      }
      el.setAttribute('aria-label', parts.join(', '));
    });
  }

  function updateSide() {
    var placedCount = 0;
    G.place.forEach(function (c) { if (c >= 0) placedCount++; });
    var all = placedCount === G.place.length;
    var sel = G.solved ? -1 : G.selected;

    G.els.cards.forEach(function (card) {
      var t = +card.getAttribute('data-t');
      var isSel = t === sel;
      var placed = G.place[t] >= 0;
      card.classList.toggle('is-selected', isSel);
      card.classList.toggle('is-placed', placed);
      card.classList.toggle('is-lone', !!G.lone[t]);
      var pill = card.querySelector('.pill-state');
      pill.textContent = stateText(t);
      pill.classList.toggle('is-placed', placed);
      var head = card.querySelector('.dcard-head');
      head.setAttribute('aria-pressed', String(isSel));
      head.setAttribute('aria-label', tokenName(t) + (placed ? ', gesetzt auf ' + cellName(G.place[t]) : ', noch offen') +
        (G.lone[t] ? ', nur noch ein Feld übrig' : '') + (isSel ? ', ausgewählt' : ''));
    });
    G.els.chips.forEach(function (chip) {
      var t = +chip.getAttribute('data-t');
      var placed = G.place[t] >= 0;
      chip.classList.toggle('is-selected', t === sel);
      chip.classList.toggle('is-viewed', t === G.view && t !== sel);
      chip.classList.toggle('is-placed', placed);
      chip.classList.toggle('is-lone', !!G.lone[t]);
      chip.querySelector('.hand-coord').textContent = placed ? cellName(G.place[t]) : '';
      chip.setAttribute('aria-pressed', String(t === sel));
      chip.setAttribute('aria-label', tokenName(t) + (placed ? ', gesetzt auf ' + cellName(G.place[t]) : ', noch offen') +
        (G.lone[t] ? ', nur noch ein Feld übrig' : '') + ' – auswählen (Taste ' + (t + 1) + ')');
      if (t === G.bounce) {
        chip.classList.remove('is-next');
        void chip.offsetWidth;
        chip.classList.add('is-next');
      }
    });
    G.bounce = -1;
    if (G.els.genChip) {
      G.els.genChip.classList.toggle('is-viewed', G.view === 'gen');
      G.els.genChip.setAttribute('aria-pressed', String(G.view === 'gen'));
    }
    renderSpot();

    G.els.modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === G.mode)); });
    MODES.forEach(function (m) { G.els.game.classList.toggle('mode-' + m, G.mode === m); });

    G.els.undo.disabled = !G.undo.length || G.solved;
    var left = MAX_HINTS - G.hints;
    G.els.hint.disabled = left <= 0 || G.solved;
    G.els.hint.setAttribute('aria-label', 'Tipp – noch ' + left + ' von ' + MAX_HINTS);
    G.els.pins.forEach(function (pin, k) { pin.classList.toggle('used', k >= left); });
    G.els.clear.disabled = G.solved || (placedCount === 0 && !G.marks.some(Boolean) && !G.notes.some(Boolean));
    G.els.solve.disabled = !all || G.solved;
    G.els.solve.innerHTML = G.solved ? 'Gelöst!' : '<span class="lbl-long">Fall </span>lösen';
    G.els.solve.setAttribute('aria-label', G.solved ? 'Gelöst' : 'Fall lösen');

    var st;
    if (G.solved) st = 'Fall gelöst. Der Täter ist überführt.';
    else if (G.mode === 'mark') st = '×-Modus: Tippe Felder an, um ein × zu setzen oder zu entfernen.';
    else if (sel >= 0 && G.mode === 'note') st = tokenName(sel) + ': Tippen = Notiz, Halten = Setzen.';
    else if (sel >= 0) st = tokenName(sel) + ': Tippe auf ein Feld zum Setzen.';
    else if (all) st = 'Alle Figuren stehen. Bereit für „Fall lösen“?';
    else st = 'Wähle eine Figur aus.';
    G.els.status.textContent = st;
  }

  /* ---------- Aktionen ---------- */

  function snapshot() {
    return { place: G.place.slice(), marks: G.marks.slice(), notes: G.notes.slice(), hinted: G.hinted.slice(), selected: G.selected };
  }
  function restoreSnap(s) {
    G.place = s.place; G.marks = s.marks; G.hinted = s.hinted; G.selected = s.selected;
    if (s.notes) G.notes = s.notes;
    if (G.selected >= 0) G.view = G.selected;
  }
  function pushUndo() {
    G.undo.push(snapshot());
    if (G.undo.length > 300) G.undo.shift();
  }
  function undo() {
    if (!G || G.solved || !G.undo.length) return;
    restoreSnap(G.undo.pop());
    updateAll();
    announce('Rückgängig gemacht.');
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
    if (!G) return;
    if (t < 0 || t >= G.place.length) return;
    if (G.solved) { G.view = t; updateSide(); return; }
    G.selected = t;
    G.view = t;
    updateSide();
    updateBoard();
    if (fromCard && isMobile()) {
      var rect = G.els.frame.getBoundingClientRect();
      if (rect.top < -rect.height * 0.35 || rect.top > window.innerHeight - 120) {
        G.els.frame.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    }
  }

  function nope(i, msg) {
    var el = G.els.cells[i];
    if (el) {
      el.classList.remove('nope');
      void el.offsetWidth;
      el.classList.add('nope');
    }
    if (msg) toast(msg, 'short');
  }

  function blockedMsg(i) {
    var o = FD.OBJECTS[G.cells[i].obj] || {};
    return 'Auf ' + (o.dat || 'diesem Möbelstück') + ' kann niemand liegen.';
  }

  function toggleMark(i) {
    var cell = G.cells[i];
    if (cell.blocked) { nope(i, 'Da steht ' + ((FD.OBJECTS[cell.obj] || {}).dat || 'ein Möbelstück') + ' – das Feld ist ohnehin tabu.'); return; }
    if (G.place.indexOf(i) >= 0) { nope(i, 'Hier liegt schon ' + tokenName(G.place.indexOf(i)) + '.'); return; }
    pushUndo();
    G.marks[i] = !G.marks[i];
    updateAll();
    announce(cellName(i) + (G.marks[i] ? ' mit × markiert.' : ': × entfernt.'));
  }

  /* Notiz der gewählten Figur umschalten. Liefert true, wenn sich etwas geändert hat. */
  function toggleNote(i) {
    var t = G.selected;
    if (t < 0) { toast('Wähle zuerst eine Figur aus.', 'short'); return false; }
    var why = noteBlock(t, i);
    if (why) {
      var msg;
      if (why === 'blocked') msg = blockedMsg(i);
      else if (why === 'marked') msg = 'Hier steht ein × – im ×-Modus wieder entfernen.';
      else if (why === 'occupied') msg = 'Hier liegt schon ' + tokenName(G.place.indexOf(i)) + '.';
      else if (why.row != null) msg = 'Reihe ' + (G.cells[i].r + 1) + ' ist schon belegt (' + tokenName(why.row) + ').';
      else msg = 'Spalte ' + COLS[G.cells[i].c] + ' ist schon belegt (' + tokenName(why.col) + ').';
      nope(i, msg);
      return false;
    }
    pushUndo();
    G.notes[i] ^= 1 << t;
    var on = !!(G.notes[i] & (1 << t));
    updateAll();
    announce('Notiz ' + tokenName(t) + ' auf ' + cellName(i) + (on ? ' gesetzt.' : ' entfernt.'));
    return true;
  }

  /* Sudoku-Autopilot: Notizen der Figur überall weg, dazu alle Notizen in Reihe und Spalte. */
  function cleanupNotes(t, i) {
    var n = G.n, r = Math.floor(i / n), c = i % n, bit = ~(1 << t);
    for (var j = 0; j < G.notes.length; j++) {
      if (Math.floor(j / n) === r || j % n === c) G.notes[j] = 0;
      else G.notes[j] &= bit;
    }
  }

  function placeToken(t, i, opts) {
    opts = opts || {};
    if (!opts.noUndo) pushUndo();
    var occ = G.place.indexOf(i);
    var bumped = occ >= 0 && occ !== t ? occ : -1;
    if (bumped >= 0) { G.place[bumped] = -1; G.hinted[bumped] = false; }
    G.place[t] = i;
    G.hinted[t] = !!opts.hint;
    G.marks[i] = false;
    cleanupNotes(t, i);
    G.selected = nextUnplaced(t);
    if (G.selected >= 0) { G.view = G.selected; G.bounce = G.selected; }
    updateAll();
    if (opts.fx) puffAt(i, t);
    announce(tokenName(t) + ' auf ' + cellName(i) + ' gesetzt.' + (bumped >= 0 ? ' ' + tokenName(bumped) + ' ist zurück auf der Hand.' : ''));
    if (G.place.every(function (c) { return c >= 0; })) {
      var conf = computeConflicts();
      if (conf.msgs.length) toast(conf.msgs[0], 'bad');
    }
  }

  function removeToken(t, opts) {
    opts = opts || {};
    var i = G.place[t];
    if (i < 0) return;
    pushUndo();
    G.place[t] = -1;
    G.hinted[t] = false;
    G.selected = t;
    G.view = t;
    updateAll();
    if (opts.fx) poofAt(i);
    announce(tokenName(t) + ' von ' + cellName(i) + ' entfernt.');
  }

  function removeAt(i) {
    if (!G || G.solved) return;
    var t = G.place.indexOf(i);
    if (t >= 0) { removeToken(t); return; }
    if (G.marks[i]) { pushUndo(); G.marks[i] = false; updateAll(); announce('× entfernt.'); return; }
    if (G.notes[i]) { pushUndo(); G.notes[i] = 0; updateAll(); announce('Notizen auf ' + cellName(i) + ' gelöscht.'); }
  }

  /* Tippen (bzw. Klick): Verhalten hängt vom Modus ab. */
  function tapCell(i) {
    if (!G || G.solved) return;
    setFocus(i, false);
    if (G.mode === 'mark') { toggleMark(i); return; }
    var occ = G.place.indexOf(i);
    if (occ >= 0) {
      if (G.mode === 'place' && occ === G.selected) removeToken(occ);
      else selectToken(occ);
      return;
    }
    if (G.cells[i].blocked) { nope(i, blockedMsg(i)); return; }
    if (G.mode === 'note') { toggleNote(i); return; }
    if (G.selected < 0) { toast('Wähle zuerst eine Figur aus – in der Leiste oder mit den Tasten 1–' + G.place.length + '.', 'short'); return; }
    placeToken(G.selected, i, { fx: true });
  }

  /* Setzen per Halten, Doppeltipp oder Enter. */
  function placeHere(i) {
    if (!G || G.solved) return;
    setFocus(i, false);
    if (G.cells[i].blocked) { nope(i, blockedMsg(i)); return; }
    var occ = G.place.indexOf(i);
    if (G.selected < 0) {
      if (occ >= 0) selectToken(occ);
      else toast('Wähle zuerst eine Figur aus.', 'short');
      return;
    }
    if (occ === G.selected) { removeToken(occ, { fx: true }); return; }
    placeToken(G.selected, i, { fx: true });
  }

  function setMode(m, silent) {
    if (!G || G.solved || MODES.indexOf(m) < 0) return;
    G.mode = m;
    save('mode', m);
    updateSide();
    if (!silent) announce(m === 'note' ? 'Modus Notiz.' : m === 'place' ? 'Modus Setzen.' : 'Modus Kreuz.');
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
      G.view = wrong;
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
    G.hints++;
    placeToken(u, target, { noUndo: true, hint: true, fx: true });
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
      btn.removeAttribute('aria-label');
      pushUndo();
      G.place = fill(G.place.length, -1);
      G.marks = fill(G.marks.length, false);
      G.notes = fill(G.notes.length, 0);
      G.hinted = fill(G.hinted.length, false);
      G.selected = 0;
      G.view = 0;
      updateAll();
      toast('Tatort geräumt. Rückgängig geht noch.');
      return;
    }
    btn.classList.add('is-armed');
    btn.textContent = 'Sicher?';
    btn.setAttribute('aria-label', 'Wirklich alles leeren? Nochmal drücken zum Bestätigen.');
    G.clearArmed = setTimeout(function () {
      if (!G) return;
      G.clearArmed = null;
      btn.classList.remove('is-armed');
      btn.textContent = 'Leeren';
      btn.removeAttribute('aria-label');
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
    endPress(true);
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

  /* ---------- Gaswolken-Effekte ---------- */

  function fxBox(i) {
    var el = G.els.cells[i], frame = G.els.frame;
    if (!el || !frame) return null;
    var a = el.getBoundingClientRect(), b = frame.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, s: a.width };
  }

  function holdFxHTML(kind, t) {
    return '<span class="hold-gas">' + art('cloud', 1) + '</span>' +
      '<svg class="hold-ring" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="r-ink" cx="50" cy="50" r="42"/><circle class="r-track" cx="50" cy="50" r="42"/>' +
      '<circle class="r-prog" cx="50" cy="50" r="42" pathLength="100" transform="rotate(-90 50 50)"/></svg>';
  }

  function showHoldFx(P) {
    if (!G || G.press !== P || P.done) return;
    var box = fxBox(P.i);
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'hold-fx is-' + P.kind;
    el.style.left = box.x + 'px';
    el.style.top = box.y + 'px';
    el.style.setProperty('--s', Math.max(56, box.s * 1.6) + 'px');
    el.style.setProperty('--tc', tokenColor(G.selected));
    el.style.setProperty('--hold', (HOLD_MS - HOLD_SHOW) + 'ms');
    el.innerHTML = holdFxHTML(P.kind);
    G.els.fx.appendChild(el);
    P.fx = el;
    if (P.kind === 'remove') G.els.cells[P.i].classList.add('is-deflating');
  }

  function dropFx(el, cls, ms) {
    if (!el) return;
    el.classList.add(cls);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, ms);
  }

  function puffAt(i, t) {
    if (!G) return;
    var box = fxBox(i);
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'puff-fx';
    el.style.left = box.x + 'px';
    el.style.top = box.y + 'px';
    el.style.setProperty('--s', Math.max(56, box.s * 1.7) + 'px');
    el.style.setProperty('--tc', tokenColor(t));
    var h = '<span class="puff-ring"></span>';
    for (var k = 0; k < 7; k++) h += '<span class="puff-bit" style="--a:' + Math.round(k * 360 / 7 + 12) + 'deg"></span>';
    el.innerHTML = h;
    G.els.fx.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
  }

  function poofAt(i) {
    if (!G) return;
    var box = fxBox(i);
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'puff-fx is-poof';
    el.style.left = box.x + 'px';
    el.style.top = box.y + 'px';
    el.style.setProperty('--s', Math.max(48, box.s * 1.3) + 'px');
    el.innerHTML = '<span class="puff-ring"></span>';
    G.els.fx.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
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

  /* Pointer-Steuerung: Tippen = Notiz, Halten (400 ms) = Setzen, Doppeltipp = Setzen. */
  function onBoardPointerDown(e) {
    if (!G) return;
    G.lastPtrType = e.pointerType || 'mouse';
    G.lastPtr = Date.now();
    if (G.solved) return;
    if (!e.isPrimary) { endPress(true); return; } // zweiter Finger: abbrechen
    if (e.pointerType === 'mouse' && e.button !== 0) return; // Rechtsklick läuft über contextmenu
    var cell = e.target.closest('.cell');
    if (!cell) return;
    dismissCoach();
    var i = +cell.getAttribute('data-i');
    endPress(true);
    if (e.shiftKey && e.pointerType === 'mouse') {
      setFocus(i, false);
      G.press = { i: i, id: e.pointerId, x: e.clientX, y: e.clientY, done: true, timers: [] };
      toggleMark(i);
      bindPress();
      return;
    }
    var P = { i: i, id: e.pointerId, x: e.clientX, y: e.clientY, done: false, cancelled: false, kind: null, timers: [], fx: null };
    if (G.mode === 'note' && G.selected >= 0 && !G.cells[i].blocked) {
      var occ = G.place.indexOf(i);
      P.kind = occ === G.selected ? 'remove' : 'place';
      P.timers.push(setTimeout(function () { showHoldFx(P); }, HOLD_SHOW));
      P.timers.push(setTimeout(function () { completeHold(P); }, HOLD_MS));
    }
    G.press = P;
    bindPress();
  }

  function bindPress() {
    window.addEventListener('pointermove', onPressMove, { passive: true });
    window.addEventListener('pointerup', onPressUp);
    window.addEventListener('pointercancel', onPressCancel);
  }
  function unbindPress() {
    window.removeEventListener('pointermove', onPressMove, { passive: true });
    window.removeEventListener('pointerup', onPressUp);
    window.removeEventListener('pointercancel', onPressCancel);
  }

  function endPress(cancel) {
    unbindPress();
    if (!G || !G.press) return;
    var P = G.press;
    G.press = null;
    P.timers.forEach(clearTimeout);
    if (G.els.cells[P.i]) G.els.cells[P.i].classList.remove('is-deflating');
    if (P.fx && !P.done) dropFx(P.fx, 'is-cancel', 160);
    if (cancel) P.cancelled = true;
  }

  function onPressMove(e) {
    var P = G && G.press;
    if (!P || e.pointerId !== P.id || P.done) return;
    var dx = e.clientX - P.x, dy = e.clientY - P.y;
    if (dx * dx + dy * dy > MOVE_TOL * MOVE_TOL) endPress(true);
  }
  function onPressCancel(e) {
    var P = G && G.press;
    if (P && e.pointerId === P.id) endPress(true);
  }
  function onPressUp(e) {
    var P = G && G.press;
    if (!P || e.pointerId !== P.id) return;
    G.lastPtr = Date.now();
    var wasDone = P.done;
    endPress(false);
    if (wasDone || P.cancelled) return;
    onTap(P.i);
  }

  function completeHold(P) {
    if (!G || G.press !== P || P.done || G.solved) return;
    P.done = true;
    P.timers.forEach(clearTimeout);
    G.els.cells[P.i].classList.remove('is-deflating');
    if (P.fx) dropFx(P.fx, 'is-done', 260);
    vibrate(12);
    G.lastTap = null;
    placeHere(P.i);
  }

  function onTap(i) {
    var now = Date.now();
    var lt = G.lastTap;
    if (G.mode === 'note' && lt && lt.i === i && now - lt.at < DBL_MS) {
      // Doppeltipp: die Notiz vom ersten Tipp zurücknehmen und direkt setzen.
      G.lastTap = null;
      if (lt.noted && G.undo.length === lt.undoLen) restoreSnap(G.undo.pop());
      if (G.place.indexOf(i) === G.selected && G.selected >= 0) { updateAll(); return; }
      vibrate(12);
      placeHere(i);
      return;
    }
    var before = G.undo.length;
    tapCell(i);
    G.lastTap = { i: i, at: now, noted: G.undo.length > before, undoLen: G.undo.length };
  }

  /* Klicks ohne Pointer davor (Screenreader, Tastatur) wie ein Tippen behandeln. */
  function onBoardClick(e) {
    var cell = e.target.closest('.cell');
    if (!cell || !G) return;
    var now = Date.now();
    if (now - G.lastPtr < 800 || now - G.kbdAt < 500) return;
    tapCell(+cell.getAttribute('data-i'));
  }

  function onBoardContext(e) {
    e.preventDefault(); // kein Kontextmenü beim langen Drücken
    if (!G || G.solved) return;
    var cell = e.target.closest('.cell');
    if (!cell) return;
    // Langes Drücken auf Touch löst contextmenu aus – das ist kein Rechtsklick.
    if (G.lastPtrType && G.lastPtrType !== 'mouse' && Date.now() - G.lastPtr < 2000) return;
    var i = +cell.getAttribute('data-i');
    setFocus(i, false);
    toggleMark(i);
  }

  function onBoardKey(e) {
    if (!G) return;
    var own = e.target && e.target.closest && e.target.closest('.cell');
    if (own) G.focus = +own.getAttribute('data-i');
    var n = G.n, i = G.focus, r = Math.floor(i / n), c = i % n;
    var k = e.key;
    dismissCoach();
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
    } else if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      G.kbdAt = Date.now();
      if (G.solved) return;
      if (e.shiftKey) { setFocus(i, false); toggleMark(i); return; }
      if (k === 'Enter') { placeHere(i); return; }
      if (G.mode === 'mark') { toggleMark(i); return; }
      var occ = G.place.indexOf(i);
      if (occ >= 0) { selectToken(occ); return; }
      if (G.cells[i].blocked) { nope(i, blockedMsg(i)); return; }
      toggleNote(i);
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
      setMode(MODES[(MODES.indexOf(G.mode) + 1) % MODES.length]);
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
      else if (act === 'sheet') toggleSheet();
      else if (act === 'spot-prev') cycleSpot(-1);
      else if (act === 'spot-next') cycleSpot(1);
      else if (act === 'coach-ok') dismissCoach();
      else if (act === 'akte') {
        var akte = a.closest('.akte');
        var open = akte.classList.toggle('is-open');
        a.setAttribute('aria-expanded', String(open));
        a.textContent = open ? 'weniger' : 'mehr';
      }
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
      if (Date.now() - G.swipedAt < 400) return; // war ein Wisch, kein Tipp
      var ci = +clue.getAttribute('data-clue');
      G.struck[ci] = !G.struck[ci];
      if (!G.struck[ci]) delete G.struck[ci];
      // Spotlight und Dossier-Karten synchron halten
      Array.prototype.forEach.call($app.querySelectorAll('.clue[data-clue="' + ci + '"]'), function (el) {
        el.classList.toggle('is-struck', !!G.struck[ci]);
        el.setAttribute('aria-pressed', String(!!G.struck[ci]));
      });
      saveProgress();
      return;
    }
    if (tgt.closest('.hand-chip.is-gen')) { G.view = 'gen'; updateSide(); return; }
    var chip = tgt.closest('.hand-chip[data-t]');
    if (chip) { selectToken(+chip.getAttribute('data-t')); return; }
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
      if (document.hidden) { pauseTimer(); saveProgress(); endPress(true); } else startTimer();
    });
    window.addEventListener('pagehide', function () { if (G) { pauseTimer(); saveProgress(); } });
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', function () { if (G && G.sheetSync) G.sheetSync(); });
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
