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
    console.log(`  ${def.id} ${p.n}x${p.n} L${p.level}: ${p.clues.length} Hinweise, Täter ${p.tokens[p.culprit].name}, ${ms} ms`);
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
