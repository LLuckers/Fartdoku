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
  const sameClue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const samePos = (a, b) => a.every((v, i) => v === b[i]);

  function generateClues(board, pos, level, rnd) {
    const nTok = pos.length, nDogs = nTok - 1;
    const pool = cluePool(board, pos, nDogs).filter((cl) => WEIGHTS[cl.type][level - 1] > 0);
    const chosen = [];
    const add = (cl) => { if (cl && !chosen.some((c) => sameClue(c, cl))) chosen.push(cl); };
    // Jeder Frenchie bekommt mindestens eine Aussage
    for (const t of shuffle([...Array(nDogs).keys()], rnd)) add(pickClue(pool.filter((cl) => cl.t === t), level, rnd));
    if (level <= 2 || rnd() < 0.5) add(pickClue(pool.filter((cl) => cl.t === nDogs), level, rnd));
    for (let guard = 0; guard < 300; guard++) {
      const sols = solve(board, nTok, chosen, 2);
      if (sols.length === 1) break;
      const alt = sols.find((s) => !samePos(s, pos));
      const useful = pool.filter((cl) => !chosen.some((c) => sameClue(c, cl)) && !clueHolds(cl, alt, board, nDogs));
      add(pickClue(useful, level, rnd));
    }
    // Überflüssiges streichen (ab Stufe 2) – jeder Hund behält mindestens eine Aussage
    if (level >= 2) {
      for (const cl of shuffle(chosen, rnd)) {
        if (cl.t !== null && cl.t < nDogs && chosen.filter((c) => c.t === cl.t).length === 1) continue;
        const rest = chosen.filter((c) => c !== cl);
        if (solve(board, nTok, rest, 2).length === 1) chosen.splice(chosen.indexOf(cl), 1);
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
        return pick([`${S} war ganz allein im Raum.`, `${S} hatte den Raum ganz für sich allein.`], rnd);
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

  function describe(cl, tokens, rnd) {
    const wid = witnessFor(cl, tokens, rnd);
    const w = FD.WITNESSES[wid];
    const prefix = pick(w.prefix, rnd);
    const body = clueText(cl, tokens, rnd);
    return { witness: w.name, text: `„${prefix ? prefix + ' ' : ''}${body}“` };
  }

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
      level: meta.level, levelName: level.name, n: board.n, mapName: FD.MAPS[board.mapId].name,
      board: { n: board.n, cells: board.cells.map(({ i, r, c, room, obj, blocked }) => ({ i, r, c, room, obj, blocked })), rooms: board.rooms },
      tokens, clues, solution: pos, culprit, snack: tokens[nDogs].id, culpritRoom: snackRoom,
      verdict: `${tokens[culprit].name} zündete ${FD.ROOMS[snackRoom].in} mit ${FD.SNACKS[tokens[nDogs].id].name} die Gaswolke!`,
    };
  }

  function generate({ id, no, title, story, level, map, snack, dogs, seed }) {
    const rnd = rng(seed);
    const board = buildBoard(map);
    const nTok = board.n;
    const dogIds = dogs || shuffle(FD.DOGS.map((d) => d.id), rnd).slice(0, nTok - 1);
    const tokens = makeTokens(dogIds, snack);
    const pos = randomSolution(board, nTok, rnd);
    const raw = generateClues(board, pos, level, rnd);
    const clues = raw.map((cl) => ({ subject: cl.t, ...describe(cl, tokens, rnd), rule: cl }));
    return finish({ id, no, title, story, level }, board, tokens, pos, clues);
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
  FD.engine = { rng, hashStr, buildBoard, solve, clueHolds, culpritOK, generate };
})();
