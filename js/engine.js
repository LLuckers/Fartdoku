/* Fartdoku – Rätsel-Engine: Löser, Hinweis-Generator und Texte. */
(function () {
  'use strict';
  const FD = (globalThis.Fartdoku = globalThis.Fartdoku || {});

  // ---------- Zufall ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

  // ---------- Spielbrett ----------
  function buildBoard(mapId) {
    const map = FD.MAPS[mapId];
    const n = map.rooms.length;
    const cells = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const room = FD.ROOM_CODES[map.rooms[r][c]];
        const ch = map.objects[r][c];
        const obj = ch === '.' ? null : FD.OBJECT_CODES[ch];
        if (!room || (ch !== '.' && !obj)) throw new Error(`Plan ${mapId}: unbekanntes Zeichen bei ${r},${c}`);
        cells.push({ i: r * n + c, r, c, room, obj, blocked: obj ? !FD.OBJECTS[obj].sit : false });
      }
    }
    const rooms = [];
    for (const cell of cells) if (!rooms.includes(cell.room)) rooms.push(cell.room);
    // Nachbarn im selben Raum (für „neben“)
    for (const cell of cells) {
      cell.nbrs = [];
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const r = cell.r + dr, c = cell.c + dc;
        if (r < 0 || c < 0 || r >= n || c >= n) continue;
        const o = cells[r * n + c];
        if (o.room === cell.room) cell.nbrs.push(o.i);
      }
    }
    return { n, mapId, cells, rooms };
  }

  // ---------- Hinweise auswerten ----------
  // Hinweis-Typen: in, notin, on, beside, either, edge (einstellig) | only, alone, count (global) | dir, same, diff (paarweise)
  const UNARY = new Set(['in', 'notin', 'on', 'beside', 'either', 'edge', 'only']);
  const PAIR = new Set(['dir', 'same', 'diff']);

  function unaryOK(cl, cell, board) {
    switch (cl.type) {
      case 'in': return cell.room === cl.room;
      case 'notin': return cell.room !== cl.room;
      case 'on':
      case 'only': return cell.obj === cl.obj;
      case 'beside': return cell.nbrs.some((j) => board.cells[j].obj === cl.obj);
      case 'either': return cell.nbrs.some((j) => board.cells[j].obj === cl.obj || board.cells[j].obj === cl.obj2);
      case 'edge': {
        const n = board.n;
        return cl.side === 'N' ? cell.r === 0 : cl.side === 'S' ? cell.r === n - 1 : cl.side === 'W' ? cell.c === 0 : cell.c === n - 1;
      }
    }
    return true;
  }
  function pairOK(cl, a, b) {
    switch (cl.type) {
      case 'dir':
        return cl.dir === 'N' ? a.r < b.r : cl.dir === 'S' ? a.r > b.r : cl.dir === 'W' ? a.c < b.c : a.c > b.c;
      case 'same': return a.room === b.room;
      case 'diff': return a.room !== b.room;
    }
    return true;
  }
  function globalOK(cl, pos, board, nDogs) {
    const C = board.cells;
    switch (cl.type) {
      case 'only':
        for (let u = 0; u < pos.length; u++) if (u !== cl.t && C[pos[u]].obj === cl.obj) return false;
        return true;
      case 'alone': {
        const room = C[pos[cl.t]].room;
        for (let u = 0; u < pos.length; u++) if (u !== cl.t && C[pos[u]].room === room) return false;
        return true;
      }
      case 'count': {
        let k = 0;
        for (let u = 0; u < nDogs; u++) if (C[pos[u]].room === cl.room) k++;
        return k === cl.k;
      }
    }
    return true;
  }
  // Grundregel: Im Raum des Snacks liegt genau ein Frenchie.
  function culpritOK(pos, board, nDogs) {
    const room = board.cells[pos[nDogs]].room;
    let k = 0;
    for (let u = 0; u < nDogs; u++) if (board.cells[pos[u]].room === room) k++;
    return k === 1;
  }
  function clueHolds(cl, pos, board, nDogs) {
    const C = board.cells;
    if (UNARY.has(cl.type) && !unaryOK(cl, C[pos[cl.t]], board)) return false;
    if (PAIR.has(cl.type)) return pairOK(cl, C[pos[cl.t]], C[pos[cl.u]]);
    return globalOK(cl, pos, board, nDogs);
  }

  // ---------- Löser ----------
  // Zählt Lösungen bis `limit`. Tokens: 0..nDogs-1 Hunde, nDogs = Snack.
  function solve(board, nTok, clues, limit = 2) {
    const nDogs = nTok - 1;
    const C = board.cells;
    const free = C.filter((c) => !c.blocked);
    const cand = [];
    for (let t = 0; t < nTok; t++) {
      const us = clues.filter((cl) => cl.t === t && UNARY.has(cl.type));
      cand.push(free.filter((cell) => us.every((cl) => unaryOK(cl, cell, board))).map((c) => c.i));
    }
    const pairs = Array.from({ length: nTok }, () => []);
    for (const cl of clues) {
      if (!PAIR.has(cl.type)) continue;
      pairs[cl.t].push(cl);
      pairs[cl.u].push(cl);
    }
    const globals = clues.filter((cl) => cl.type === 'only' || cl.type === 'alone' || cl.type === 'count');
    const pos = new Array(nTok).fill(-1);
    let rowUsed = 0, colUsed = 0;
    const sols = [];

    function fits(t, ci) {
      const cell = C[ci];
      if ((rowUsed >> cell.r) & 1 || (colUsed >> cell.c) & 1) return false;
      for (const cl of pairs[t]) {
        const other = cl.t === t ? cl.u : cl.t;
        if (pos[other] < 0) continue;
        const ok = cl.t === t ? pairOK(cl, cell, C[pos[other]]) : pairOK(cl, C[pos[other]], cell);
        if (!ok) return false;
      }
      return true;
    }

    function rec(placed) {
      if (placed === nTok) {
        if (!culpritOK(pos, board, nDogs)) return false;
        for (const cl of globals) if (!globalOK(cl, pos, board, nDogs)) return false;
        sols.push(pos.slice());
        return sols.length >= limit;
      }
      // MRV: Token mit den wenigsten passenden Feldern zuerst
      let best = -1, bestList = null;
      for (let t = 0; t < nTok; t++) {
        if (pos[t] >= 0) continue;
        const list = [];
        for (const ci of cand[t]) if (fits(t, ci)) list.push(ci);
        if (list.length === 0) return false;
        if (!bestList || list.length < bestList.length) {
          best = t;
          bestList = list;
          if (list.length === 1) break;
        }
      }
      for (const ci of bestList) {
        const cell = C[ci];
        pos[best] = ci;
        rowUsed |= 1 << cell.r;
        colUsed |= 1 << cell.c;
        const done = rec(placed + 1);
        rowUsed &= ~(1 << cell.r);
        colUsed &= ~(1 << cell.c);
        pos[best] = -1;
        if (done) return true;
      }
      return false;
    }
    rec(0);
    return sols;
  }

  // ---------- Lösung würfeln ----------
  function randomSolution(board, nTok, rnd) {
    const n = board.n, nDogs = nTok - 1;
    for (let tries = 0; tries < 20000; tries++) {
      const rows = shuffle([...Array(n).keys()], rnd);
      const cols = shuffle([...Array(n).keys()], rnd);
      const pos = rows.map((r, t) => r * n + cols[t]);
      if (pos.some((ci) => board.cells[ci].blocked)) continue;
      if (!culpritOK(pos, board, nDogs)) continue;
      return pos;
    }
    throw new Error('Keine gültige Aufstellung gefunden');
  }

  // ---------- Hinweis-Pool ----------
  function cluePool(board, pos, nDogs) {
    const C = board.cells;
    const nTok = pos.length;
    const pool = [];
    const objTypes = [...new Set(C.filter((c) => c.obj).map((c) => c.obj))];
    for (let t = 0; t < nTok; t++) {
      const cell = C[pos[t]];
      pool.push({ type: 'in', t, room: cell.room });
      for (const room of board.rooms) if (room !== cell.room) pool.push({ type: 'notin', t, room });
      if (cell.obj) {
        pool.push({ type: 'on', t, obj: cell.obj });
        if (pos.every((p, u) => u === t || C[p].obj !== cell.obj)) pool.push({ type: 'only', t, obj: cell.obj });
      }
      const near = [...new Set(cell.nbrs.map((j) => C[j].obj).filter(Boolean))];
      for (const obj of near) {
        pool.push({ type: 'beside', t, obj });
        for (const obj2 of objTypes) if (obj2 !== obj && !near.includes(obj2)) pool.push({ type: 'either', t, obj, obj2 });
      }
      const n = board.n;
      if (cell.r === 0) pool.push({ type: 'edge', t, side: 'N' });
      if (cell.r === n - 1) pool.push({ type: 'edge', t, side: 'S' });
      if (cell.c === 0) pool.push({ type: 'edge', t, side: 'W' });
      if (cell.c === n - 1) pool.push({ type: 'edge', t, side: 'E' });
      if (t < nDogs && pos.every((p, u) => u === t || C[p].room !== cell.room)) pool.push({ type: 'alone', t });
      for (let u = 0; u < nTok; u++) {
        if (u === t) continue;
        const o = C[pos[u]];
        pool.push({ type: 'dir', t, u, dir: cell.r < o.r ? 'N' : 'S' });
        pool.push({ type: 'dir', t, u, dir: cell.c < o.c ? 'W' : 'E' });
        if (t < nDogs && u < nDogs && u > t) pool.push({ type: cell.room === o.room ? 'same' : 'diff', t, u });
      }
    }
    for (const room of board.rooms) {
      let k = 0;
      for (let u = 0; u < nDogs; u++) if (C[pos[u]].room === room) k++;
      pool.push({ type: 'count', t: null, room, k });
    }
    return pool;
  }

  // Gewichte je Schwierigkeitsstufe (1..4)
  const WEIGHTS = {
    in: [6, 2.5, 1, 0.4],
    notin: [0.6, 1.5, 2, 2.5],
    on: [5, 3, 1.5, 0.8],
    only: [1, 1.5, 2, 2],
    beside: [3, 3, 3, 2.5],
    either: [0, 0.8, 2, 3],
    edge: [3, 2, 1.2, 0.8],
    alone: [1, 1.5, 2, 2],
    dir: [0.3, 1.5, 3, 4],
    same: [0.5, 1, 2, 2.5],
    diff: [0.3, 1, 2, 2.5],
    count: [1, 1.5, 2, 2],
  };
  function pickClue(cands, level, rnd) {
    const byType = {};
    for (const cl of cands) (byType[cl.type] = byType[cl.type] || []).push(cl);
    const types = Object.keys(byType);
    const ws = types.map((ty) => WEIGHTS[ty][level - 1]);
    let total = ws.reduce((a, b) => a + b, 0);
    if (total <= 0) return pick(cands, rnd);
    let x = rnd() * total;
    for (let i = 0; i < types.length; i++) {
      x -= ws[i];
      if (x <= 0) return pick(byType[types[i]], rnd);
    }
    return pick(byType[types[types.length - 1]], rnd);
  }
  const samePos = (a, b) => a.every((v, i) => v === b[i]);

  function generateClues(board, pos, level, rnd) {
    const nTok = pos.length, nDogs = nTok - 1;
    const pool = cluePool(board, pos, nDogs).filter((cl) => WEIGHTS[cl.type][level - 1] > 0);
    const chosen = [];
    const keys = new Map(pool.map((cl) => [cl, JSON.stringify(cl)]));
    const used = new Set();
    const fresh = (cl) => !used.has(keys.get(cl));
    const add = (cl) => { if (cl && fresh(cl)) { chosen.push(cl); used.add(keys.get(cl)); } };
    // Jeder Frenchie bekommt mindestens eine Aussage
    for (const t of shuffle([...Array(nDogs).keys()], rnd)) add(pickClue(pool.filter((cl) => cl.t === t), level, rnd));
    if (level <= 2 || rnd() < 0.5) add(pickClue(pool.filter((cl) => cl.t === nDogs), level, rnd));
    for (let guard = 0; guard < 300; guard++) {
      const sols = solve(board, nTok, chosen, 2);
      if (sols.length === 1) break;
      const alt = sols.find((s) => !samePos(s, pos));
      const useful = pool.filter((cl) => fresh(cl) && !clueHolds(cl, alt, board, nDogs));
      add(pickClue(useful, level, rnd));
    }
    // Eindeutig reicht nicht: Der Fall muss sich auch Schritt für Schritt ohne Raten lösen lassen.
    // Bleibt der Logik-Löser hängen, kommt eine Aussage dazu, die einen übrig gebliebenen Irrweg streicht.
    const budget = TRIAL_BUDGET[level - 1];
    const logicOK = (cls) => logic(board, nTok, cls, { maxTrials: budget }).solved;
    for (let guard = 0; guard < 100; guard++) {
      const res = logic(board, nTok, chosen, { maxTrials: budget });
      if (res.solved) break;
      // Wie viele übrig gebliebene Irrwege würde eine Aussage direkt streichen?
      const kills = new Map();
      for (let t = 0; t < nTok; t++) {
        for (const ci of res.cand[t]) {
          if (ci === pos[t]) continue;
          const alt = pos.slice();
          alt[t] = ci;
          for (const cl of pool) if (fresh(cl) && !clueHolds(cl, alt, board, nDogs)) kills.set(cl, (kills.get(cl) || 0) + 1);
        }
      }
      if (!kills.size) break;
      const top = Math.max(...kills.values());
      add(pickClue([...kills].filter(([, k]) => k * 2 >= top).map(([cl]) => cl), level, rnd));
    }
    // Überflüssiges streichen (ab Stufe 2) – jeder Hund behält mindestens eine Aussage
    if (level >= 2) {
      for (const cl of shuffle(chosen, rnd)) {
        if (cl.t !== null && cl.t < nDogs && chosen.filter((c) => c.t === cl.t).length === 1) continue;
        const rest = chosen.filter((c) => c !== cl);
        if (solve(board, nTok, rest, 2).length === 1 && logicOK(rest)) { chosen.splice(chosen.indexOf(cl), 1); used.delete(keys.get(cl)); }
      }
    }
    return chosen;
  }

  // ---------- Texte ----------
  const EDGE = {
    N: 'ganz im Norden des Schlosses (oberste Reihe)',
    S: 'ganz im Süden des Schlosses (unterste Reihe)',
    W: 'ganz im Westen des Schlosses (linke Spalte)',
    E: 'ganz im Osten des Schlosses (rechte Spalte)',
  };
  const DIR = { N: 'nördlich', S: 'südlich', W: 'westlich', E: 'östlich' };
  const NUM = ['kein', 'genau ein', 'genau zwei', 'genau drei', 'genau vier', 'genau fünf', 'genau sechs', 'genau sieben'];

  function clueText(cl, tokens, rnd) {
    const T = cl.t === null ? null : tokens[cl.t];
    const isSnack = T && T.kind === 'snack';
    const S = T ? (isSnack ? FD.SNACKS[T.id].nom : T.name) : '';
    const s = T ? (isSnack ? FD.SNACKS[T.id].nom.replace(/^D/, 'd') : T.name) : '';
    const U = cl.u !== undefined ? tokens[cl.u] : null;
    const u = U ? (U.kind === 'snack' ? `dem ${FD.SNACKS[U.id].name}` : U.name) : '';
    const R = cl.room ? FD.ROOMS[cl.room] : null;
    const O = cl.obj ? FD.OBJECTS[cl.obj] : null;
    const verb = isSnack ? 'lag' : pick(['war', 'lag', 'hockte'], rnd);
    const snackName = isSnack ? FD.SNACKS[T.id].name : '';
    switch (cl.type) {
      case 'in':
        return isSnack
          ? pick([`Die Methan-Probe ${R.in} zeigt eindeutig: ${snackName}.`, `${S} lag ${R.in}.`], rnd)
          : pick([`${S} ${verb} ${R.in}.`, `Ich habe ${s} ${R.in} gesehen. Und gerochen.`, `${S} hat den ganzen Abend ${R.in} verbracht.`], rnd);
      case 'notin':
        return isSnack
          ? `${R.In} wurde definitiv KEIN ${snackName} gegessen!`
          : pick([`${S} war ganz sicher nicht ${R.in}.`, `${S} hat sich ${R.in} nicht blicken lassen.`, `${R.In} war ${s} nicht, da lege ich die Pfote ins Feuer.`], rnd);
      case 'on':
        return pick([`${S} lag ${O.on}.`, `${S} hat es sich ${O.on} gemütlich gemacht.`], rnd);
      case 'only':
        return isSnack ? `${S} lag ${O.on}. Sonst lag dort nichts und niemand.` : `${S} war der einzige Frenchie ${O.on}. Nichts und niemand sonst lag ${O.on}.`;
      case 'beside':
        return pick([`${S} ${verb} direkt neben ${O.dat}.`, `${S} schnüffelte direkt neben ${O.dat} herum.`], rnd);
      case 'either':
        return `${S} ${verb} entweder neben ${O.dat} oder neben ${FD.OBJECTS[cl.obj2].dat}.`;
      case 'edge':
        return `${S} ${verb} ${EDGE[cl.side]}.`;
      case 'alone':
        return pick([`${S} war ganz allein im Raum – kein anderer Frenchie, nicht mal ein Snack.`, `${S} hatte den Raum ganz für sich allein. Da lag sonst nichts und niemand.`], rnd);
      case 'dir':
        return `${S} ${verb} irgendwo ${DIR[cl.dir]} ${u.startsWith('dem ') ? 'vom ' + u.slice(4) : 'von ' + u}.`;
      case 'same':
        return pick([`${S} und ${u} waren im selben Raum.`, `${S} hing mit ${u} im selben Raum ab.`], rnd);
      case 'diff':
        return `${S} und ${u} waren in verschiedenen Räumen.`;
      case 'count':
        return cl.k === 0
          ? `${R.In} war kein einziger Frenchie. Keine Hundeseele.`
          : `${R.In} ${cl.k === 1 ? 'war' : 'waren'} ${NUM[cl.k]} Frenchie${cl.k === 1 ? '' : 's'}.`;
    }
    return '';
  }

  function witnessFor(cl, tokens, rnd) {
    const T = cl.t === null ? null : tokens[cl.t];
    if (T && T.kind === 'snack') return pick(['labor', 'analyst', 'koechin'], rnd);
    if (cl.room === 'kueche' || cl.room === 'speisekammer' || cl.obj === 'kuehlschrank' || cl.obj === 'herd') return pick(['koechin', 'butler'], rnd);
    if (cl.room === 'gewaechshaus' || cl.room === 'wintergarten' || cl.obj === 'pflanze') return pick(['gaertner', 'katze'], rnd);
    return pick(['butler', 'zimmer', 'katze', 'analyst', 'gaertner'], rnd);
  }

  function describe(cl, tokens, rnd, witnesses) {
    const wid = witnesses ? pick(witnesses, rnd) : witnessFor(cl, tokens, rnd);
    const w = FD.WITNESSES[wid];
    const prefix = pick(w.prefix, rnd);
    const body = clueText(cl, tokens, rnd);
    return { witness: w.name, text: `„${prefix ? prefix + ' ' : ''}${body}“` };
  }

  // ---------- Logischer Löser: Lösungsweg wie bei Murdoku ----------
  // Arbeitet wie ein Mensch mit Kandidatenlisten (welche Figur kann noch wohin?) und
  // wendet nur einzeln begründbare Schlüsse an. Jeder Schluss ist sicher – findet der
  // Löser damit alle Figuren, ist die Lösung eindeutig und ohne Raten erreichbar.
  const COLN = 'ABCDEFGH';
  const joinList = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1]);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function namer(board, tokens) {
    const n = board.n;
    const isSnack = (t) => tokens[t].kind === 'snack';
    const nom = (t) => (isSnack(t) ? FD.SNACKS[tokens[t].id].nom : tokens[t].name);
    const nomL = (t) => (isSnack(t) ? nom(t).replace(/^D/, 'd') : nom(t));
    const von = (t) => (isSnack(t) ? 'vom ' + FD.SNACKS[tokens[t].id].name : 'von ' + tokens[t].name);
    // „für“ + Akkusativ, „mit“ + Dativ
    const art = (t, m, nt) => (FD.SNACKS[tokens[t].id].nom.startsWith('Das') ? nt : m);
    const akk = (t) => (isSnack(t) ? art(t, 'den', 'das') + ' ' + FD.SNACKS[tokens[t].id].name : tokens[t].name);
    const dat = (t) => (isSnack(t) ? 'dem ' + FD.SNACKS[tokens[t].id].name : tokens[t].name);
    const cell = (i) => COLN[i % n] + (Math.floor(i / n) + 1);
    const cells = (a) => joinList(a.map(cell));
    const row = (r) => `Zeile ${r + 1}`;
    const col = (c) => `Spalte ${COLN[c]}`;
    const R = (k) => FD.ROOMS[k];
    const names = (ts) => joinList(ts.map(nom));
    return { n, isSnack, nom, nomL, von, akk, dat, cell, cells, row, col, R, names };
  }

  const EDGE_SHORT = { N: 'in der obersten Reihe', S: 'in der untersten Reihe', W: 'in der linken Spalte', E: 'in der rechten Spalte' };
  const NUMW = ['kein', 'genau ein', 'genau zwei', 'genau drei', 'genau vier', 'genau fünf', 'genau sechs', 'genau sieben'];

  // Kurze, neutrale Fassung einer Regel („Pierre liegt im Salon“).
  function ruleShort(cl, X) {
    const A = cl.t == null ? '' : X.nom(cl.t);
    const O = cl.obj ? FD.OBJECTS[cl.obj] : null;
    const Rm = cl.room ? FD.ROOMS[cl.room] : null;
    switch (cl.type) {
      case 'in': return `${A} liegt ${Rm.in}`;
      case 'notin': return `${A} liegt nicht ${Rm.in}`;
      case 'on': return `${A} liegt ${O.on}`;
      case 'only': return `${A} liegt ${O.on} – und sonst liegt nichts und niemand ${O.on}`;
      case 'beside': return `${A} liegt direkt neben ${O.dat} (im selben Raum)`;
      case 'either': return `${A} liegt direkt neben ${O.dat} oder ${FD.OBJECTS[cl.obj2].dat} (im selben Raum)`;
      case 'edge': return `${A} liegt ${EDGE_SHORT[cl.side]}`;
      case 'alone': return `${A} hatte den Raum ganz für sich – kein anderer Frenchie, kein Snack`;
      case 'dir': return `${A} liegt ${DIR[cl.dir]} ${X.von(cl.u)}`;
      case 'same': return `${A} und ${X.nom(cl.u)} lagen im selben Raum`;
      case 'diff': return `${A} und ${X.nom(cl.u)} lagen in verschiedenen Räumen`;
      case 'count': return cl.k === 0 ? `${Rm.In} lag kein einziger Frenchie` : `${Rm.In} ${cl.k === 1 ? 'lag' : 'lagen'} ${NUMW[cl.k]} Frenchie${cl.k === 1 ? '' : 's'}`;
    }
    return '';
  }

  function logic(board, nTok, rules, opt) {
    opt = opt || {};
    const n = board.n, N = n * n, C = board.cells, nDogs = nTok - 1, SN = nDogs;
    const X = opt.namer || null; // ohne Namer: schnell, ohne Texte (für den Generator)
    const maxTrials = opt.maxTrials == null ? Infinity : opt.maxTrials;
    const free = C.filter((c) => !c.blocked).map((c) => c.i);
    const roomCells = {};
    for (const c of C) (roomCells[c.room] = roomCells[c.room] || []).push(c.i);
    const rowOf = (i) => Math.floor(i / n), colOf = (i) => i % n;

    const init = () => ({
      cand: Array.from({ length: nTok }, () => { const a = new Uint8Array(N); for (const i of free) a[i] = 1; return a; }),
      fixed: new Array(nTok).fill(-1),
    });
    const clone = (st) => ({ cand: st.cand.map((a) => a.slice()), fixed: st.fixed.slice() });
    const list = (st, t) => { const o = [], a = st.cand[t]; for (let i = 0; i < N; i++) if (a[i]) o.push(i); return o; };
    const count = (st, t) => { let k = 0; const a = st.cand[t]; for (let i = 0; i < N; i++) k += a[i]; return k; };
    const roomsOf = (st, t) => { const s = new Set(); for (const i of list(st, t)) s.add(C[i].room); return s; };
    const inRoom = (st, t, room) => list(st, t).some((i) => C[i].room === room);
    const confinedTo = (st, t, room) => list(st, t).every((i) => C[i].room === room);

    // Sammelt Streichungen, nur für Felder, die wirklich noch Kandidat sind.
    function elims(st) {
      const m = new Map();
      return {
        add(t, i) { if (!st.cand[t][i]) return; if (!m.has(t)) m.set(t, new Set()); m.get(t).add(i); },
        get size() { let k = 0; for (const s of m.values()) k += s.size; return k; },
        list() { return [...m].map(([t, s]) => ({ t, cells: [...s].sort((a, b) => a - b) })).filter((e) => e.cells.length); },
      };
    }
    function apply(st, f) {
      for (const e of f.elim) for (const i of e.cells) st.cand[e.t][i] = 0;
      for (const p of f.place) { st.fixed[p.t] = p.cell; st.cand[p.t].fill(0); st.cand[p.t][p.cell] = 1; }
    }
    const mk = (kind, E, extra) => Object.assign({ kind, elim: E ? E.list() : [], place: [], clue: null, focus: [], rows: [], cols: [], rooms: [] }, extra);

    // Folgen einer Streichung in Worten (nach dem Anwenden ausgewertet).
    function consequence(f, st) {
      const parts = [];
      for (const e of f.elim) {
        if (st.fixed[e.t] >= 0) continue;
        const rem = list(st, e.t);
        if (rem.length === 1) parts.push(`Für ${X.akk(e.t)} bleibt nur noch ${X.cell(rem[0])}.`);
        else if (rem.length <= 4) parts.push(`Für ${X.akk(e.t)} kommen nur noch ${X.cells(rem)} in Frage.`);
        else if (e.cells.length <= 4) parts.push(`Für ${X.akk(e.t)} ${e.cells.length === 1 ? 'fällt' : 'fallen'} ${X.cells(e.cells)} weg.`);
        else parts.push(`Für ${X.akk(e.t)} bleiben noch ${rem.length} Felder.`);
      }
      return parts.join(' ');
    }

    // Was ein Schluss bewirkt, kurz für Gedankenketten („Bruno muss auf C3“).
    function effectShort(f) {
      if (f.place.length) return `${X.nom(f.place[0].t)} müsste auf ${X.cell(f.place[0].cell)}`;
      const e = f.elim;
      if (!e.length) return '';
      const who = e.length === 1
        ? `${X.nom(e[0].t)} ${e[0].cells.length <= 3 ? 'nicht auf ' + X.cells(e[0].cells) : 'verliert ' + e[0].cells.length + ' Felder'}`
        : `${X.names(e.map((x) => x.t))} verlieren Felder`;
      return f.short ? `${who} (${f.short})` : who;
    }

    // --- Widersprüche ---
    function contradiction(st) {
      for (let t = 0; t < nTok; t++) if (!count(st, t)) return X ? `${X.nom(t)} hätte kein Feld mehr` : 'x';
      for (let r = 0; r < n; r++) {
        let ok = false;
        for (let t = 0; t < nTok && !ok; t++) for (let c = 0; c < n; c++) if (st.cand[t][r * n + c]) { ok = true; break; }
        if (!ok) return X ? `In ${X.row(r)} könnte niemand mehr liegen` : 'x';
      }
      for (let c = 0; c < n; c++) {
        let ok = false;
        for (let t = 0; t < nTok && !ok; t++) for (let r = 0; r < n; r++) if (st.cand[t][r * n + c]) { ok = true; break; }
        if (!ok) return X ? `In ${X.col(c)} könnte niemand mehr liegen` : 'x';
      }
      return null;
    }

    // --- Technik 1: nur noch ein Feld -> setzen ---
    function naked(st) {
      for (let t = 0; t < nTok; t++) {
        if (st.fixed[t] >= 0 || count(st, t) !== 1) continue;
        const i = list(st, t)[0], r = rowOf(i), c = colOf(i);
        const E = elims(st);
        for (let u = 0; u < nTok; u++) if (u !== t) for (let k = 0; k < n; k++) { E.add(u, r * n + k); E.add(u, k * n + c); }
        const f = mk('place', E, { focus: [t], rows: [r], cols: [c] });
        f.place = [{ t, cell: i }];
        if (X) {
          f.title = `${X.nom(t)} steht fest`;
          f.short = `${X.nom(t)} muss auf ${X.cell(i)}`;
          f.text = `${X.nom(t)} kann nur noch auf ${X.cell(i)} liegen – gesetzt!` +
            (f.elim.length ? ` Damit sind ${X.row(r)} und ${X.col(c)} für alle anderen gesperrt.` : '');
        }
        return f;
      }
      return null;
    }

    // --- Technik 2: Figur steckt in einer Zeile/Spalte fest -> die ist für andere tabu ---
    function confined(st) {
      for (let t = 0; t < nTok; t++) {
        if (st.fixed[t] >= 0) continue;
        const cs = list(st, t);
        for (const [ax, of, name] of [['row', rowOf, X && X.row], ['col', colOf, X && X.col]]) {
          const v = of(cs[0]);
          if (!cs.every((i) => of(i) === v)) continue;
          const E = elims(st);
          for (let u = 0; u < nTok; u++) if (u !== t) for (let k = 0; k < n; k++) E.add(u, ax === 'row' ? v * n + k : k * n + v);
          if (!E.size) continue;
          const f = mk('line', E, { focus: [t], rows: ax === 'row' ? [v] : [], cols: ax === 'col' ? [v] : [] });
          if (X) {
            f.title = `${cap(name(v))} ist vergeben`;
            f.short = `${name(v)} gehört ${X.dat(t)}`;
            f.text = `Alle Felder, die für ${X.akk(t)} noch in Frage kommen (${X.cells(cs)}), liegen in ${name(v)}. ` +
              `Jede ${ax === 'row' ? 'Zeile' : 'Spalte'} hat nur Platz für eine Figur – also kann dort sonst niemand liegen.`;
          }
          return f;
        }
      }
      return null;
    }

    // --- Technik 3: in einer Zeile/Spalte kann nur noch eine Figur liegen -> sie muss dorthin ---
    function hidden(st) {
      for (const ax of ['row', 'col']) {
        for (let v = 0; v < n; v++) {
          const idx = (k) => (ax === 'row' ? v * n + k : k * n + v);
          const who = [];
          for (let t = 0; t < nTok; t++) for (let k = 0; k < n; k++) if (st.cand[t][idx(k)]) { who.push(t); break; }
          if (who.length !== 1) continue;
          const t = who[0];
          const E = elims(st);
          for (const i of list(st, t)) if ((ax === 'row' ? rowOf(i) : colOf(i)) !== v) E.add(t, i);
          if (!E.size) continue;
          const f = mk('hidden', E, { focus: [t], rows: ax === 'row' ? [v] : [], cols: ax === 'col' ? [v] : [] });
          if (X) {
            const nm = ax === 'row' ? X.row(v) : X.col(v);
            f.title = `Nur ${X.nom(t)} passt in ${nm}`;
            f.short = `${X.nom(t)} muss in ${nm}`;
            f.text = `In ${nm} kann nur noch ${X.nomL(t)} liegen – und jede ${ax === 'row' ? 'Zeile' : 'Spalte'} braucht genau eine Figur. Also liegt ${X.nomL(t)} in ${nm}.`;
          }
          return f;
        }
      }
      return null;
    }

    // --- Technik 4: eine Aussage mit dem aktuellen Stand auswerten ---
    function clueStep(st, ci) {
      const cl = rules[ci];
      const E = elims(st);
      let why = '', focus = cl.t == null ? [] : [cl.t], rooms = [], contra = null;
      switch (cl.type) {
        case 'in': case 'notin': case 'on': case 'beside': case 'either': case 'edge':
          for (const i of list(st, cl.t)) if (!unaryOK(cl, board.cells[i], board)) E.add(cl.t, i);
          if (cl.room) rooms = [cl.room];
          break;
        case 'only': {
          for (const i of list(st, cl.t)) if (C[i].obj !== cl.obj) E.add(cl.t, i);
          const before = E.size;
          for (let u = 0; u < nTok; u++) if (u !== cl.t) for (const i of list(st, u)) if (C[i].obj === cl.obj) E.add(u, i);
          if (X && E.size > before) why = `Niemand sonst liegt ${FD.OBJECTS[cl.obj].on}.`;
          break;
        }
        case 'dir': {
          const t = cl.t, u = cl.u, ver = cl.dir === 'N' || cl.dir === 'S';
          const of = ver ? rowOf : colOf;
          const tv = list(st, t).map(of), uv = list(st, u).map(of);
          // t < u (N/W) oder t > u (S/E)
          const less = cl.dir === 'N' || cl.dir === 'W';
          const uMax = Math.max(...uv), uMin = Math.min(...uv), tMax = Math.max(...tv), tMin = Math.min(...tv);
          const lim = [];
          for (const i of list(st, t)) if (less ? of(i) >= uMax : of(i) <= uMin) E.add(t, i);
          const tGone = E.size;
          for (const i of list(st, u)) if (less ? of(i) <= tMin : of(i) >= tMax) E.add(u, i);
          if (X) {
            const nmv = (v) => (ver ? X.row(v) : X.col(v));
            const beyond = ver ? { max: 'tiefer', min: 'höher' } : { max: 'weiter rechts', min: 'weiter links' };
            const before = ver ? { max: 'oberhalb von', min: 'unterhalb von' } : { max: 'links von', min: 'rechts von' };
            const space = ver ? { max: 'darunter', min: 'darüber' } : { max: 'rechts davon', min: 'links davon' };
            // a verliert Felder, weil b (Grenze bv) auf der Seite `side` begrenzt ist
            const part = (a, b, bv, side) => ((side === 'max' ? bv === n - 1 : bv === 0)
              ? `${X.nom(a)} kann nicht in ${nmv(bv)} liegen, sonst bliebe für ${X.akk(b)} ${space[side]} kein Platz.`
              : `${X.nom(b)} liegt nicht ${beyond[side]} als ${nmv(bv)} – also muss ${X.nomL(a)} ${before[side]} ${nmv(bv)} liegen.`);
            if (tGone) lim.push(less ? part(t, u, uMax, 'max') : part(t, u, uMin, 'min'));
            if (E.size > tGone) lim.push(less ? part(u, t, tMin, 'min') : part(u, t, tMax, 'max'));
            why = lim.join(' ');
          }
          focus = [t, u];
          break;
        }
        case 'same': case 'diff': {
          const t = cl.t, u = cl.u;
          for (const [a, b] of [[t, u], [u, t]]) {
            const rb = roomsOf(st, b);
            const gone = E.size;
            if (cl.type === 'same') { for (const i of list(st, a)) if (!rb.has(C[i].room)) E.add(a, i); }
            else if (rb.size === 1) { const only = [...rb][0]; for (const i of list(st, a)) if (C[i].room === only) E.add(a, i); }
            if (X && E.size > gone) {
              const rs = [...rb].map((k) => FD.ROOMS[k].name);
              why += (why ? ' ' : '') + (cl.type === 'same'
                ? `${X.nom(b)} kann nur ${rs.length === 1 ? FD.ROOMS[[...rb][0]].in : 'in ' + joinList(rs)} liegen, also ${X.nomL(a)} auch.`
                : `${X.nom(b)} liegt sicher ${FD.ROOMS[[...rb][0]].in}, also ${X.nomL(a)} nicht.`);
              rooms = rooms.concat([...rb]);
            }
          }
          focus = [t, u];
          break;
        }
        case 'alone': {
          const t = cl.t;
          // andere Figur steckt sicher in einem Raum -> t kann dort nicht allein sein
          const blockedRooms = new Map();
          for (let u = 0; u < nTok; u++) if (u !== t) { const rs = roomsOf(st, u); if (rs.size === 1) { const k = [...rs][0]; if (!blockedRooms.has(k)) blockedRooms.set(k, u); } }
          for (const i of list(st, t)) if (blockedRooms.has(C[i].room)) E.add(t, i);
          const g1 = E.size;
          if (X && g1) {
            const ks = [...new Set(E.list().flatMap((e) => e.cells.map((i) => C[i].room)))];
            why = ks.map((k) => `${X.nom(blockedRooms.get(k))} liegt sicher ${FD.ROOMS[k].in} – dort wäre ${X.nomL(t)} nicht allein.`).join(' ');
            rooms = ks;
          }
          const rt = roomsOf(st, t);
          if (rt.size === 1) {
            const k = [...rt][0];
            for (let u = 0; u < nTok; u++) if (u !== t) for (const i of list(st, u)) if (C[i].room === k) E.add(u, i);
            if (X && E.size > g1) { why += (why ? ' ' : '') + `${X.nom(t)} liegt sicher ${FD.ROOMS[k].in} und war dort allein – also liegt dort sonst nichts und niemand.`; rooms.push(k); }
          }
          break;
        }
        case 'count': {
          const k = cl.room, dogs = [...Array(nDogs).keys()];
          const forced = dogs.filter((u) => confinedTo(st, u, k)), possible = dogs.filter((u) => inRoom(st, u, k));
          rooms = [k];
          if (forced.length > cl.k || possible.length < cl.k) { contra = X ? `${FD.ROOMS[k].In} müssten ${NUMW[cl.k]} Frenchies liegen – das geht nicht mehr` : 'x'; break; }
          if (forced.length === cl.k) {
            for (const u of dogs) if (!forced.includes(u)) for (const i of list(st, u)) if (C[i].room === k) E.add(u, i);
            if (X && E.size) why = cl.k === 0 ? `Also fällt ${FD.ROOMS[k].name} für alle Frenchies weg.` : `Das ${cl.k === 1 ? 'ist' : 'sind'} schon ${X.names(forced)} – alle anderen Frenchies fallen ${FD.ROOMS[k].in} raus.`;
          } else if (possible.length === cl.k) {
            for (const u of possible) for (const i of list(st, u)) if (C[i].room !== k) E.add(u, i);
            if (X && E.size) why = `Nur ${X.names(possible)} ${possible.length === 1 ? 'kann' : 'können'} überhaupt noch ${FD.ROOMS[k].in} liegen – also ${possible.length === 1 ? 'liegt' : 'liegen'} ${possible.length === 1 ? X.nomL(possible[0]) : 'sie alle'} dort.`;
          }
          break;
        }
      }
      if (contra) return { contra };
      if (!E.size) return null;
      const f = mk('clue', E, { clue: ci, focus, rooms: [...new Set(rooms)] });
      if (X) {
        f.rs = ruleShort(cl, X);
        f.why = why;
        const w = opt.witness ? String(opt.witness(ci) || '') : '';
        f.short = w ? 'laut ' + w.replace(/^Der /, 'dem ').replace(/^Die /, 'der ').replace(/^Das /, 'dem ') : 'laut Aussage';
      }
      return f;
    }

    // --- Technik 5: Grundregel – der Täter war allein mit dem Snack ---
    function culpritStep(st) {
      const dogs = [...Array(nDogs).keys()];
      const E = elims(st);
      let why = '';
      const bad = new Map();
      for (const i of list(st, SN)) {
        const k = C[i].room;
        const forced = dogs.filter((u) => confinedTo(st, u, k)), possible = dogs.filter((u) => inRoom(st, u, k));
        if (forced.length >= 2) { E.add(SN, i); bad.set(k, X ? `${X.names(forced)} liegen beide sicher ${FD.ROOMS[k].in}` : ''); }
        else if (!possible.length) { E.add(SN, i); bad.set(k, X ? `${FD.ROOMS[k].In} kann gar kein Frenchie mehr liegen` : ''); }
      }
      let rooms = [...bad.keys()];
      if (X && E.size) why = `Im Raum des Snacks liegt genau ein Frenchie, der Täter. ${[...bad.values()].map(cap).join('. ')} – also liegt der Snack dort nicht.`;
      if (!E.size) {
        const rs = roomsOf(st, SN);
        if (rs.size === 1) {
          const k = [...rs][0];
          const forced = dogs.filter((u) => confinedTo(st, u, k)), possible = dogs.filter((u) => inRoom(st, u, k));
          rooms = [k];
          if (forced.length === 1) {
            for (const u of dogs) if (u !== forced[0]) for (const i of list(st, u)) if (C[i].room === k) E.add(u, i);
            if (X && E.size) why = `${X.nom(SN)} liegt sicher ${FD.ROOMS[k].in}, und ${X.nomL(forced[0])} liegt auch dort. Der Täter war allein mit dem Snack – also kein weiterer Frenchie ${FD.ROOMS[k].in}.`;
          } else if (possible.length === 1) {
            for (const i of list(st, possible[0])) if (C[i].room !== k) E.add(possible[0], i);
            if (X && E.size) why = `${X.nom(SN)} liegt sicher ${FD.ROOMS[k].in}, und dort muss genau ein Frenchie liegen. Nur ${X.nomL(possible[0])} kommt dafür noch in Frage.`;
          }
        }
      }
      if (!E.size) return null;
      const f = mk('culprit', E, { focus: [SN], rooms });
      if (X) { f.title = 'Der Täter war allein'; f.why = why; f.short = bad.size ? 'Täter-Regel: ' + [...bad.values()][0] : 'Täter-Regel'; }
      return f;
    }

    // --- Technik 6: k Figuren teilen sich k Zeilen/Spalten ---
    function hall(st) {
      const open = [];
      for (let t = 0; t < nTok; t++) if (st.fixed[t] < 0) open.push(t);
      const m = open.length;
      if (m < 4) return null;
      const masks = [];
      for (let s = 1; s < 1 << m; s++) {
        const k = popc(s);
        if (k >= 2 && k <= m - 2) masks.push(s);
      }
      masks.sort((a, b) => popc(a) - popc(b));
      for (const ax of ['row', 'col']) {
        const of = ax === 'row' ? rowOf : colOf;
        const lines = open.map((t) => { let b = 0; for (const i of list(st, t)) b |= 1 << of(i); return b; });
        for (const s of masks) {
          let u = 0; const S = [];
          for (let j = 0; j < m; j++) if ((s >> j) & 1) { u |= lines[j]; S.push(open[j]); }
          if (popc(u) !== S.length) continue;
          const E = elims(st);
          const vs = [];
          for (let v = 0; v < n; v++) if ((u >> v) & 1) vs.push(v);
          for (let t = 0; t < nTok; t++) if (!S.includes(t)) for (const i of list(st, t)) if ((u >> of(i)) & 1) E.add(t, i);
          if (!E.size) continue;
          const f = mk('line', E, { focus: S, rows: ax === 'row' ? vs : [], cols: ax === 'col' ? vs : [] });
          if (X) {
            const nm = joinList(vs.map((v) => (ax === 'row' ? String(v + 1) : COLN[v])));
            const word = ax === 'row' ? 'Zeilen' : 'Spalten';
            f.title = `${S.length} Figuren, ${S.length} ${word}`;
            f.short = `${X.names(S)} teilen sich die ${word} ${nm}`;
            f.text = `${X.names(S)} können nur noch in den ${word} ${nm} liegen. Das sind ${S.length} Figuren für ${S.length} ${word} – die ${word} sind damit komplett belegt, für alle anderen also tabu.`;
          }
          return f;
        }
      }
      return null;
    }

    function step(st) {
      return naked(st) || confined(st) || hidden(st) || clues(st) || culpritStep(st) || hall(st);
    }
    // Aussagen in Karten-Reihenfolge prüfen (wie finish() sie sortiert), damit Generator und Anzeige denselben Weg gehen.
    const order = rules.map((cl, ci) => ci).sort((a, b) => subj(rules[a]) - subj(rules[b]) || a - b);
    function clues(st) {
      for (const ci of order) {
        const f = clueStep(st, ci);
        if (f) return f;
      }
      return null;
    }

    // Läuft ohne Annahmen, bis nichts mehr geht. Liefert Widerspruch oder Ende.
    function propagate(st, maxLen, chain) {
      for (let g = 0; g < maxLen; g++) {
        const why = contradiction(st);
        if (why) return { contra: why, len: g };
        // auch bei voll besetztem Brett weiterprüfen: Aussagen können noch verletzt sein
        const f = step(st);
        if (!f) return st.fixed.every((x) => x >= 0) ? { done: true } : { stuck: true };
        if (f.contra) return { contra: f.contra, len: g };
        apply(st, f);
        if (chain) chain.push(f);
      }
      return { stuck: true };
    }

    // --- Technik 7: Annahme -> Widerspruch ---
    // Bevorzugt kurze Gedankenketten: erst eine mit < 4 Schlüssen, sonst < 10, sonst irgendeine.
    function trial(st) {
      const open = [];
      for (let t = 0; t < nTok; t++) if (st.fixed[t] < 0) open.push(t);
      open.sort((a, b) => count(st, a) - count(st, b));
      let mid = null, any = null;
      for (const t of open) {
        for (const i of list(st, t)) {
          const s2 = clone(st);
          const r = rowOf(i), c = colOf(i);
          const E = elims(s2);
          for (let u = 0; u < nTok; u++) if (u !== t) for (let k = 0; k < n; k++) { E.add(u, r * n + k); E.add(u, k * n + c); }
          const assume = mk('place', E);
          assume.place = [{ t, cell: i }];
          apply(s2, assume);
          const chain = X ? [] : null;
          const res = propagate(s2, any ? (mid ? 4 : 10) : 500, chain);
          if (!res.contra) continue;
          const hit = { t, i, res, chain };
          if (res.len < 4) return trialFinding(st, hit);
          if (res.len < 10) { if (!mid) mid = hit; }
          else if (!any) any = hit;
        }
      }
      const best = mid || any;
      return best ? trialFinding(st, best) : null;
    }
    function trialFinding(st, { t, i, res, chain }) {
      const E2 = elims(st);
      E2.add(t, i);
      const f = mk('trial', E2, { focus: [t] });
      if (X) {
        const shorts = chain.map((x) => effectShort(x)).filter(Boolean);
        const shown = shorts.length > 5 ? shorts.slice(0, 2).concat(['…'], shorts.slice(-2)) : shorts;
        f.title = `Gedankenexperiment mit ${X.dat(t)}`;
        f.short = `${X.nom(t)} nicht auf ${X.cell(i)}`;
        f.text = `Angenommen, ${X.nomL(t)} läge auf ${X.cell(i)}. ` +
          (shown.length ? `Dann: ${shown.join(' → ')}. ` : '') +
          `Widerspruch: ${res.contra}! Also liegt ${X.nomL(t)} nicht auf ${X.cell(i)}.`;
      }
      return f;
    }

    // ---------- Hauptschleife ----------
    const st = init();
    const steps = [];
    let trials = 0;
    const snap = () => Array.from({ length: nTok }, (_, t) => list(st, t));
    if (X) {
      steps.push({
        kind: 'start', title: 'Los geht’s', clue: null, focus: [], elim: [], place: [], rows: [], cols: [], rooms: [],
        text: 'Am Anfang kann jede Figur auf jedes freie Feld. Auf Möbeln liegt niemand. In jeder Zeile und jeder Spalte liegt genau eine Figur, ' +
          'und der Täter ist der einzige Frenchie im Raum des Snacks. Jetzt streichen wir Schritt für Schritt alles, was nicht passt.',
        cand: snap(),
      });
    }
    let ok = true;
    for (let guard = 0; guard < 500; guard++) {
      if (contradiction(st)) { ok = false; break; }
      if (st.fixed.every((x) => x >= 0)) break;
      let f = step(st);
      if (f && f.contra) { ok = false; break; }
      if (!f && trials < maxTrials) { f = trial(st); if (f) trials++; }
      if (!f) break;
      apply(st, f);
      if (X) {
        if (f.kind === 'clue') {
          const w = opt.witness ? opt.witness(f.clue) : '';
          f.title = w ? `Aussage: ${w}` : 'Aussage';
          f.text = `${cap(f.rs)}.` + (f.why ? ' ' + f.why : '') + ' ' + consequence(f, st);
        } else if (f.kind === 'culprit' || f.kind === 'hidden' || f.kind === 'line') {
          f.text = (f.why || f.text) + ' ' + consequence(f, st);
        } else if (f.kind === 'trial') {
          f.text += ' ' + consequence(f, st);
        }
        steps.push({
          kind: f.kind, title: f.title, text: f.text.trim().replace(/\s+/g, ' '), clue: f.clue, focus: f.focus,
          elim: f.elim, place: f.place, rows: f.rows, cols: f.cols, rooms: f.rooms, cand: snap(),
        });
      }
    }
    const solved = ok && st.fixed.every((x) => x >= 0);
    return { solved, trials, steps, fixed: st.fixed.slice(), cand: snap() };
  }
  const subj = (cl) => (cl.t === null || cl.t === undefined ? 99 : cl.t);
  function popc(x) { let k = 0; while (x) { x &= x - 1; k++; } return k; }

  // Wie viele Annahmen („Gedankenexperimente“) eine Stufe höchstens braucht.
  const TRIAL_BUDGET = [0, 0, 2, 5];

  // ---------- Fälle zusammenbauen ----------
  function makeTokens(dogIds, snack) {
    const tokens = dogIds.map((id, idx) => {
      const d = FD.DOGS.find((x) => x.id === id);
      return { idx, kind: 'dog', id, name: d.name, color: d.color };
    });
    tokens.push({ idx: dogIds.length, kind: 'snack', id: snack, name: FD.SNACKS[snack].name, color: '#FFD23F' });
    return tokens;
  }

  function finish(meta, board, tokens, pos, clues) {
    const nDogs = tokens.length - 1;
    const snackRoom = board.cells[pos[nDogs]].room;
    const culprit = pos.findIndex((p, u) => u < nDogs && board.cells[p].room === snackRoom);
    const level = FD.LEVELS[meta.level - 1];
    // Karten-Reihenfolge: nach Token, allgemeine Hinweise zuletzt
    clues.sort((a, b) => (a.subject === null ? 99 : a.subject) - (b.subject === null ? 99 : b.subject));
    return {
      id: meta.id, no: meta.no ?? null, title: meta.title, story: meta.story,
      level: meta.level, levelName: level.name, n: board.n, map: board.mapId, mapName: FD.MAPS[board.mapId].name,
      board: { n: board.n, cells: board.cells.map(({ i, r, c, room, obj, blocked }) => ({ i, r, c, room, obj, blocked })), rooms: board.rooms },
      tokens, clues, solution: pos, culprit, snack: tokens[nDogs].id, culpritRoom: snackRoom,
      verdict: `${tokens[culprit].name} zündete ${FD.ROOMS[snackRoom].in} mit ${FD.SNACKS[tokens[nDogs].id].name} die Gaswolke!${meta.verdictSuffix ? ' ' + meta.verdictSuffix : ''}`,
    };
  }

  function generate({ id, no, title, story, level, map, snack, dogs, seed, witnesses, verdictSuffix }) {
    const rnd = rng(seed);
    const board = buildBoard(map);
    const nTok = board.n;
    const dogIds = dogs || shuffle(FD.DOGS.filter((d) => !d.guest).map((d) => d.id), rnd).slice(0, nTok - 1);
    const tokens = makeTokens(dogIds, snack);
    const pos = randomSolution(board, nTok, rnd);
    const raw = generateClues(board, pos, level, rnd);
    const clues = raw.map((cl) => ({ subject: cl.t, ...describe(cl, tokens, rnd, witnesses), rule: cl }));
    return finish({ id, no, title, story, level, verdictSuffix }, board, tokens, pos, clues);
  }

  // Handgebaute Fälle: Hinweise vorgegeben, Lösung per Löser ermittelt.
  function buildHandmade(def) {
    const board = buildBoard(def.map);
    const tokens = makeTokens(def.dogs, def.snack);
    const tIdx = (key) => (key === 'snack' ? tokens.length - 1 : def.dogs.indexOf(key));
    const rules = def.clues.map((c) => ({ ...c, t: c.t == null ? null : tIdx(c.t), u: c.u == null ? undefined : tIdx(c.u) }));
    const sols = solve(board, tokens.length, rules, 2);
    if (sols.length !== 1) throw new Error(`${def.id}: ${sols.length} Lösungen statt genau einer`);
    const clues = def.clues.map((c, i) => {
      const dog = FD.DOGS.find((d) => d.id === c.w);
      return { subject: rules[i].t, witness: dog ? dog.name : FD.WITNESSES[c.w].name, text: c.text, rule: rules[i] };
    });
    return finish(def, board, tokens, sols[0], clues);
  }

  const cache = {};
  FD.getCase = function (id) {
    if (cache[id]) return cache[id];
    const def = FD.CASES.find((c) => c.id === id);
    if (!def) return null;
    const p = def.clues ? buildHandmade(def) : generate({ ...def, seed: hashStr(def.id + (def.salt || '')) });
    return (cache[id] = p);
  };

  FD.generateRandom = function ({ n = 6, level = 2, seed = Date.now() } = {}) {
    const rnd = rng(seed ^ 0x5eed);
    const map = pick(FD.MAPS_BY_SIZE[n] || FD.MAPS_BY_SIZE[6], rnd);
    const snack = pick(Object.keys(FD.SNACKS), rnd);
    return generate({
      id: 'zufall', no: null, level, map, snack, seed,
      title: pick(FD.RANDOM_TITLES, rnd), story: pick(FD.RANDOM_STORIES, rnd),
    });
  };

  // Für Tests
  // Lösungsweg für einen fertigen Fall (wird pro Fall zwischengespeichert).
  const stepsCache = new WeakMap();
  FD.solutionSteps = function (p) {
    if (stepsCache.has(p)) return stepsCache.get(p);
    const board = buildBoard(p.map);
    const rules = p.clues.map((c) => c.rule);
    const X = namer(board, p.tokens);
    const res = logic(board, p.tokens.length, rules, { namer: X, witness: (ci) => p.clues[ci].witness });
    const last = res.steps[res.steps.length - 1];
    if (res.solved) {
      const nDogs = p.tokens.length - 1;
      res.steps.push({
        kind: 'final', title: 'Fall gelöst!', clue: null, focus: [p.culprit, nDogs], elim: [], place: [],
        rows: [], cols: [], rooms: [p.culpritRoom], cand: last.cand,
        text: `Alle Figuren stehen fest. ${X.nom(nDogs)} liegt ${FD.ROOMS[p.culpritRoom].in} – und der einzige Frenchie dort ist ${p.tokens[p.culprit].name}. ${p.verdict}`,
      });
    }
    const out = { solved: res.solved, steps: res.steps };
    stepsCache.set(p, out);
    return out;
  };

  FD.engine = { rng, hashStr, buildBoard, solve, clueHolds, culpritOK, generate, logic, TRIAL_BUDGET };
})();
