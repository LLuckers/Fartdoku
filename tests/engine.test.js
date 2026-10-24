// Prüft, dass jeder Fall genau eine Lösung hat und die Täter-Regel erfüllt.
// Aufruf: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
require('../js/data.js');
require('../js/engine.js');
const FD = globalThis.Fartdoku;
const { solve, buildBoard, clueHolds, culpritOK } = FD.engine;

function checkPuzzle(p) {
  const board = buildBoard(FD.CASES.find((c) => c.id === p.id)?.map || mapOf(p));
  const nTok = p.tokens.length;
  const nDogs = nTok - 1;
  const rules = p.clues.map((c) => c.rule);
  const sols = solve(board, nTok, rules, 2);
  assert.strictEqual(sols.length, 1, `${p.id}: ${sols.length} Lösungen`);
  assert.deepStrictEqual(sols[0], p.solution, `${p.id}: Lösung weicht ab`);
  for (const r of rules) assert.ok(clueHolds(r, p.solution, board, nDogs), `${p.id}: Hinweis falsch ${JSON.stringify(r)}`);
  assert.ok(culpritOK(p.solution, board, nDogs));
  for (let t = 0; t < nDogs; t++) assert.ok(p.clues.some((c) => c.subject === t), `${p.id}: ${p.tokens[t].name} ohne Aussage`);
  const rows = new Set(p.solution.map((i) => Math.floor(i / p.n)));
  const cols = new Set(p.solution.map((i) => i % p.n));
  assert.strictEqual(rows.size, p.n);
  assert.strictEqual(cols.size, p.n);
  for (const c of p.clues) assert.ok(c.text.length > 5 && !c.text.includes('undefined'), `${p.id}: Text kaputt: ${c.text}`);
  checkSteps(p);
}

// Lösungsweg: ohne Raten vollständig, jeder Schritt korrekt, Stufen-Budget für Gedankenexperimente eingehalten.
function checkSteps(p) {
  const res = FD.solutionSteps(p);
  assert.ok(res.solved, `${p.id}: Lösungsweg bleibt stecken`);
  const steps = res.steps;
  assert.strictEqual(steps[0].kind, 'start');
  assert.strictEqual(steps[steps.length - 1].kind, 'final');
  const T = p.tokens.length;
  let prev = steps[0].cand;
  for (const [k, s] of steps.entries()) {
    const where = `${p.id} Schritt ${k} (${s.kind})`;
    assert.ok(s.title && s.text && !/undefined|NaN|null/.test(s.title + s.text), `${where}: Text kaputt: ${s.title} :: ${s.text}`);
    assert.strictEqual(s.cand.length, T);
    for (let t = 0; t < T; t++) {
      assert.ok(s.cand[t].includes(p.solution[t]), `${where}: richtige Position von ${p.tokens[t].name} gestrichen`);
      assert.ok(s.cand[t].every((i) => prev[t].includes(i)), `${where}: Kandidaten wachsen`);
    }
    if (k > 0 && s.kind !== 'final') assert.ok(s.elim.length || s.place.length, `${where}: Schritt ohne Wirkung`);
    for (const e of s.elim) for (const i of e.cells) assert.ok(!s.cand[e.t].includes(i), `${where}: Streichung nicht übernommen`);
    if (s.clue != null) assert.ok(p.clues[s.clue], `${where}: Hinweis fehlt`);
    prev = s.cand;
  }
  assert.ok(prev.every((c, t) => c.length === 1 && c[0] === p.solution[t]), `${p.id}: Endstand ist nicht die Lösung`);
  const trials = steps.filter((s) => s.kind === 'trial').length;
  assert.ok(trials <= FD.engine.TRIAL_BUDGET[p.level - 1], `${p.id}: ${trials} Gedankenexperimente auf Stufe ${p.level}`);
  return steps.length;
}

function mapOf(p) {
  return Object.keys(FD.MAPS).find((k) => {
    const m = FD.MAPS[k];
    return m.rooms.length === p.n && p.board.cells.every((c) => FD.ROOM_CODES[m.rooms[c.r][c.c]] === c.room);
  });
}

for (const def of FD.CASES) {
  test(`${def.id} ${def.title}`, () => {
    const t0 = Date.now();
    const p = FD.getCase(def.id);
    const ms = Date.now() - t0;
    checkPuzzle(p);
    const st = FD.solutionSteps(p).steps;
    console.log(`  ${def.id} ${p.n}x${p.n} L${p.level}: ${p.clues.length} Hinweise, ${st.length} Schritte (${st.filter((x) => x.kind === 'trial').length} Annahmen), Täter ${p.tokens[p.culprit].name}, ${ms} ms`);
  });
}

test('Zufallsfälle für alle Größen und Stufen', () => {
  for (const n of [5, 6, 7, 8]) {
    for (const level of [1, 2, 3, 4]) {
      for (let s = 1; s <= 3; s++) {
        const t0 = Date.now();
        const p = FD.generateRandom({ n, level, seed: n * 1000 + level * 10 + s });
        checkPuzzle(p);
        const ms = Date.now() - t0;
        if (ms > 1500) console.log(`  langsam: ${n}x${n} L${level} s${s} ${ms} ms`);
      }
    }
  }
});

test('Gaststars tauchen nicht in Zufallsfällen auf', () => {
  const guests = FD.DOGS.filter((d) => d.guest).map((d) => d.id);
  for (let s = 1; s <= 20; s++) {
    const p = FD.generateRandom({ n: 8, level: 2, seed: s });
    assert.ok(p.tokens.every((t) => !guests.includes(t.id)));
  }
});
