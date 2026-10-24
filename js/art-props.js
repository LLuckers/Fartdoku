/* Fartdoku - SVG artwork for snacks and floor-plan furniture (40x40 icons).
 * Loaded after js/art.js; uses its drawing helpers (FD.art._h) and registers FD.artProps.
 * No ids / url(#) references, so any number of copies can live on one page.
 *
 * Style rules for the board (cells can be ~28 px on phones):
 *  - lie-on spots (kissen, teppich, sessel, korb) are soft, wide and fill the corners,
 *    because a dog token covers the inscribed circle; no floor shadow, no faces.
 *  - blocking furniture is tall and solid, stands on a floor shadow and mostly has
 *    a grumpy little personality. Every icon owns one dominant colour. */
(function(){
'use strict';
const FD = globalThis.Fartdoku = globalThis.Fartdoku || {};
const { INK, PINK, CHEESE, GAS, SKY, ORANGE, RED, TEAL, PURPLE, WHITE, P, L, C, E, R, f1, stink } = FD.art._h;

const W = 2.5; // outline width for 40-box icons

// little helpers ------------------------------------------------------
const shadow = (cx, rx, cy) => `<ellipse cx="${cx}" cy="${cy || 37.6}" rx="${rx}" ry="2" fill="${INK}" opacity="0.22"/>`;
// googly eye: white ball, pupil pushed by (dx, dy)
const goggle = (x, y, r, dx, dy) => C(x, y, r, WHITE, 1.6) + C(f1(x + (dx || 0)), f1(y + (dy || 0)), f1(r * 0.52), INK);
// buzzing fly with a dotted flight path behind it (from = [x, y])
function fly(x, y, from) {
  let s = '';
  if (from) s += `<path d="M${from[0]} ${from[1]} Q${f1((from[0] + x) / 2)} ${f1(Math.min(from[1], y) - 5)} ${x} ${y}" fill="none" stroke="${INK}" stroke-width="1.1" stroke-dasharray="1.2 1.8" stroke-linecap="round"/>`;
  s += E(x - 2, y - 2.3, 2.4, 1.5, '#DDF3FF', 1.3, INK, -35) + E(x + 2, y - 2.3, 2.4, 1.5, '#DDF3FF', 1.3, INK, 35);
  s += C(x, y, 2.3, INK) + C(f1(x + 0.9), f1(y - 0.6), 0.8, RED);
  return s;
}
const drop = (x, y, h, fill, w) => P(`M${x} ${y} Q${f1(x + h * 0.55)} ${f1(y + h * 0.7)} ${x} ${f1(y + h)} Q${f1(x - h * 0.55)} ${f1(y + h * 0.7)} ${x} ${y} Z`, fill, w == null ? 1.4 : w);

/* ------------------------------------------------------------------ */
/* SNACKS (40x40)                                                      */
/* ------------------------------------------------------------------ */
const SNACKS = {
  // Harzer: a sweating yellow wedge that melts off the plate
  kaese() {
    let s = '';
    s += stink('M9 15 Q6.5 12.5 9 10 Q11.5 7.5 9 5', 2.2);
    s += stink('M18 12 Q15.5 9.5 18 7 Q20.5 4.5 18 2', 2.2);
    s += P('M3 23 L26 12 L37 18.5 Z', '#FFEC94', W);
    s += P('M3 23 L37 18.5 L37 29 C37 34.5 33 34.5 33 30.2 L27.5 30.8 C27.5 37.5 22.5 37.5 22.5 31.4 L13.5 32.4 C13.5 35.5 9.5 35.5 9.5 32.7 L3 33 Z', CHEESE, W);
    s += E(10.5, 27.5, 2.7, 2.1, '#D99A00') + E(19.5, 25.5, 2.1, 1.7, '#D99A00') + E(30, 24.5, 2, 2.5, '#D99A00');
    s += E(25.5, 15.8, 2.3, 1.1, '#F0C43A');
    s += L('M6 30.5 L9 30.3', '#FFF3BF', 1.6);
    s += fly(31, 7, [24, 9]);
    return s;
  },
  // Döner spit dripping grease, one slice peeling off
  doener() {
    let s = '';
    s += L('M20 2.5 L20 38', INK, 4.2) + L('M20 2.5 L20 38', '#B9B2C2', 1.8);
    s += P('M18.6 3.2 L20 0.2 L21.4 3.2 Z', '#B9B2C2', 1.4);
    s += E(20, 37, 9, 1.8, '#8C8494', 2);
    const meat = 'M8 8 L32 8 Q34 11 31.2 13.8 Q33 17.2 30.2 20.4 Q31.6 23.8 28.4 27 Q29 30.4 26 32 L14 32 Q11 30.4 11.6 27 Q8.4 23.8 9.8 20.4 Q7 17.2 8.8 13.8 Q6 11 8 8 Z';
    s += P(meat, '#C9773A', W);
    s += P('M8.8 13.8 Q20 17 31.2 13.8 L30.2 20.4 Q20 23.5 9.8 20.4 Z', '#8A3F18', 0);
    s += P('M11.6 27 Q20 29.8 28.4 27 L26 32 L14 32 Z', '#8A3F18', 0);
    s += P(meat, 'none', W);
    s += L('M11 10.5 Q11.5 12.5 11.2 13.5 M12.8 22.5 Q13.4 24.5 13 26', '#F2B070', 1.8);
    s += P('M31 14.5 Q38 16 37 23.5 Q33.5 21.5 30 21.5 Z', '#D9864A', 1.9);
    s += E(20, 7.8, 11, 2.3, '#B9B2C2', 2.1);
    s += drop(15, 31.5, 4.5, '#FFC93C') + drop(25.2, 31.5, 5.2, '#FFC93C') + drop(31.5, 26, 4, '#FFC93C');
    s += stink('M5 21 Q2.5 18.5 5 16 Q7.5 13.5 5 11', 2);
    s += fly(33, 5, [27, 2.5]);
    return s;
  },
  // Pansen: olive, honeycombed flap in a puddle of green slime, two flies
  pansen() {
    let s = '';
    s += P('M3 34.5 Q4 31 12 31.5 L30 31 Q37.5 31.5 37 34.5 Q36 37.8 20 37.8 Q4 37.8 3 34.5 Z', GAS, 2);
    s += P('M5 26 C2 17 9 10 17 13 C24 7 37 12 35 21 C38 29 30 34 20 32 C13 35 7 32 5 26 Z', '#B3AA6E', W);
    const hex = (x, y) => `M${x - 3.6} ${y} L${f1(x - 1.8)} ${f1(y - 3.1)} L${f1(x + 1.8)} ${f1(y - 3.1)} L${x + 3.6} ${y} L${f1(x + 1.8)} ${f1(y + 3.1)} L${f1(x - 1.8)} ${f1(y + 3.1)} Z `;
    let d = '';
    [[11, 21.5], [18.6, 18.5], [26.2, 20.5], [14.5, 27.5], [22.2, 25.8], [29.4, 27]].forEach(([x, y]) => d += hex(x, y));
    s += `<path d="${d}" fill="#99904F" stroke="#6E6838" stroke-width="1.5" stroke-linejoin="round"/>`;
    s += P('M11 31.5 C11 36.5 15 36.5 15 32 Z', '#B3AA6E', 1.6);
    s += stink('M20 11 Q17.5 8.5 20 6 Q22.5 3.5 20 1.5', 2.1);
    s += fly(31, 6, [25, 9]);
    s += fly(8, 8);
    return s;
  },
  // Rosenkohl: a pile of sprouts, the top one grins like a chemical weapon
  rosenkohl() {
    let s = '';
    const sprout = (x, y, r, fill, dark) =>
      C(x, y, r, fill, W) +
      L(`M${f1(x - r * 0.7)} ${f1(y - r * 0.2)} Q${f1(x - r * 0.1)} ${f1(y + r * 0.3)} ${f1(x + r * 0.3)} ${f1(y + r * 0.95)}`, dark, 1.9) +
      L(`M${f1(x + r * 0.75)} ${f1(y - r * 0.35)} Q${f1(x + r * 0.25)} ${f1(y + r * 0.1)} ${f1(x + r * 0.05)} ${f1(y + r * 0.9)}`, dark, 1.9) +
      E(f1(x - r * 0.4), f1(y - r * 0.45), f1(r * 0.26), f1(r * 0.16), '#C8F2A8', 0, 0, -35);
    s += stink('M6 19 Q3.5 16.5 6 14 Q8.5 11.5 6 9', 2);
    s += stink('M34 19 Q31.5 16.5 34 14 Q36.5 11.5 34 9', 2);
    s += sprout(11.5, 29, 8, '#58B03A', '#337A22');
    s += sprout(28.5, 29, 8, '#58B03A', '#337A22');
    s += C(20, 17.5, 9, '#7ED957', W);
    s += L('M14 13 Q17 17 15.5 23 M26 13 Q23 17 24.5 23', '#4FA336', 1.7);
    s += L('M20 8.5 L19 5.5', '#337A22', 2.6);
    s += E(16.6, 17, 2.4, 2.1, WHITE, 1.4) + E(23.4, 17, 2.4, 2.1, WHITE, 1.4);
    s += C(17.3, 17.6, 1.1, INK) + C(22.7, 17.6, 1.1, INK);
    s += L('M13.3 13.8 L19 15.8 M26.7 13.8 L21 15.8', INK, 2);
    s += L('M16 21.5 Q20 24.5 24 21.5', INK, 1.8);
    return s;
  },
  // Bohneneintopf: blue enamel pot boiling over with brown beans
  bohnen() {
    let s = '';
    s += R(1, 21.5, 6, 4.5, 2.2, SKY, 2.1) + R(33, 21.5, 6, 4.5, 2.2, SKY, 2.1);
    s += P('M5.5 20 L34.5 20 L33 33 Q32.4 36.5 28 36.5 L12 36.5 Q7.6 36.5 7 33 Z', SKY, W);
    s += C(11, 27, 1.1, WHITE) + C(16, 32, 1, WHITE) + C(27.5, 30.5, 1.2, WHITE) + C(31, 25, 0.9, WHITE) + C(21.5, 27.5, 0.9, WHITE);
    s += P('M5.5 19.5 Q6.5 12.5 12.5 13.5 Q16 8.5 21.5 11 Q27 8 30 12.5 Q35 12.5 34.5 19.5 Z', '#B9562A', W);
    s += R(3.5, 17.5, 33, 4, 2, '#7FD6F7', W);
    s += P('M10 19.5 L10 24.5 C10 27.3 13.6 27.3 13.6 24.5 L13.6 19.5 Z', '#B9562A', 1.7);
    s += P('M25 19.5 L25 22.5 C25 24.8 28 24.8 28 22.5 L28 19.5 Z', '#B9562A', 1.7);
    [[11, 15.5, -20], [16.5, 13.3, 15], [22, 14, -10], [27.5, 15.2, 25], [14, 17.3, 5], [24.5, 17.3, -30], [19.5, 16.8, 0]]
      .forEach(([x, y, r]) => { s += E(x, y, 2.4, 1.6, '#6B2410', 1.1, INK, r); });
    s += C(25, 7.5, 2.2, '#D9773F', 1.6) + L('M28.5 3.5 L29.5 2 M30.5 6 L32.5 5.5', INK, 1.5);
    s += stink('M15 10 Q12.5 7.5 15 5 Q17.5 2.5 15 1', 2);
    return s;
  }
};


/* ------------------------------------------------------------------ */
/* FLOOR-PLAN OBJECTS (40x40)                                          */
/* ------------------------------------------------------------------ */
const OBJECTS = {
  /* ---------- lie-on spots: flat, plush, corner-filling ---------- */

  // squashed hot-pink velvet cushion, dented in the middle, fat gold tassels
  kissen() {
    let s = '';
    [[4, 5, -45], [36, 5, 45], [36, 35, 135], [4, 35, -135]].forEach(([x, y, r]) => {
      s += E(x, y, 2.6, 3.8, CHEESE, 1.8, INK, r);
    });
    s += P('M5 7 Q20 11 35 7 Q31.5 20 35 33 Q20 29 5 33 Q8.5 20 5 7 Z', '#E8329A', W);
    s += E(20, 20.5, 10.5, 7.5, '#CC2A88');
    s += L('M10 10.5 Q20 13.3 30 10.5', '#FF8CCB', 2.2);
    [[13, 14.5], [27, 14.5], [13, 26.5], [27, 26.5]].forEach(([x, y]) => { s += C(x, y, 1.8, '#7E1452', 1.2, INK); });
    [[5, 7], [35, 7], [35, 33], [5, 33]].forEach(([x, y]) => { s += C(x, y, 2.3, CHEESE, 1.8); });
    return s;
  },
  // turquoise Persian rug with fringes and a flipped-up corner
  teppich() {
    let s = '';
    let fr = '';
    for (let y = 7.5; y <= 33; y += 3.6) fr += `M0.8 ${f1(y)} L4 ${f1(y)} `;
    for (let y = 7.5; y <= 25; y += 3.6) fr += `M36 ${f1(y)} L39.2 ${f1(y)} `;
    s += L(fr, INK, 3.4) + L(fr, '#FFF3D6', 1.6);
    s += P('M4 4.5 L36 4.5 L36 27 L28.5 35.5 L4 35.5 Z', TEAL, W);
    s += P('M8 8.5 L32 8.5 L32 26 L26 31.5 L8 31.5 Z', 'none', 2, CHEESE);
    s += P('M20 10.5 L28.5 20 L20 29.5 L11.5 20 Z', '#FF5A2A', 2);
    s += P('M20 15.2 L24.3 20 L20 24.8 L15.7 20 Z', CHEESE, 1.6);
    s += C(8, 8.5, 2, '#FF5A2A', 1.5) + C(32, 8.5, 2, '#FF5A2A', 1.5) + C(8, 31.5, 2, '#FF5A2A', 1.5);
    s += P('M36 27 L28.5 35.5 L29.5 25.5 Z', '#1C8C82', 2.2);
    return s;
  },
  // squat purple throne-armchair: wing back with gold crown, fat rolled arms, ball feet
  sessel() {
    let s = '';
    s += C(6, 35.5, 2.6, CHEESE, 1.8) + C(34, 35.5, 2.6, CHEESE, 1.8);
    s += P('M8 23 L5.5 6.5 Q5 3.5 8.5 4.5 Q14 6 16 4 L24 4 Q26 6 31.5 4.5 Q35 3.5 34.5 6.5 L32 23 Z', PURPLE, W);
    s += P('M16 5 L15.5 0.8 L18 2.8 L20 0.5 L22 2.8 L24.5 0.8 L24 5 Z', CHEESE, 1.5);
    s += C(5.8, 4.2, 1.9, CHEESE, 1.5) + C(34.2, 4.2, 1.9, CHEESE, 1.5);
    s += C(14, 11.5, 1.4, '#3F2CA0') + C(26, 11.5, 1.4, '#3F2CA0') + C(20, 16, 1.4, '#3F2CA0');
    s += L('M14 11.5 L20 16 L26 11.5', '#5A43D0', 1.2);
    s += P('M5 29 L35 29 L34 34.5 L6 34.5 Z', '#5A43D0', W);
    s += R(9, 20.5, 22, 9.5, 4.5, '#A796FF', W);
    s += L('M13 23.5 Q20 22 27 23.5', '#CBBFFF', 1.8);
    s += R(1.5, 14.5, 10.5, 17.5, 5.2, PURPLE, W) + C(6.7, 19.5, 2.6, '#5A43D0', 1.6);
    s += R(28, 14.5, 10.5, 17.5, 5.2, PURPLE, W) + C(33.3, 19.5, 2.6, '#5A43D0', 1.6);
    return s;
  },
  // big caramel wicker basket with a pink plaid blanket and a gnawed bone
  korb() {
    let s = '';
    s += R(1.5, 6, 37, 31, 9, '#E0A458', W);
    s += `<rect x="4.5" y="9" width="31" height="25" rx="7" fill="none" stroke="#9A5F22" stroke-width="2" stroke-dasharray="2.2 1.8"/>`;
    s += R(7.5, 11, 25, 20, 6, '#FF7FB0', 2);
    s += L('M7.5 18 L32.5 18 M7.5 24.5 L32.5 24.5 M15.5 11 L15.5 31 M24.5 11 L24.5 31', '#E0508A', 1.8);
    s += L('M2 24 Q20 30 38 24', '#9A5F22', 1.6);
    s += P('M2.2 26 Q20 31.5 37.8 26 L37 29 Q34.5 37 28 37 L12 37 Q5.5 37 3 29 Z', '#C98436', W);
    s += L('M8 30 L9 35 M14 31.5 L14.6 36 M20 32 L20 36.3 M26 31.5 L25.4 36 M32 30 L31 35', '#8B5A2B', 1.5);
    // bone poking out of the top-right corner
    s += L('M24 15 L33 5', INK, 6) + L('M24 15 L33 5', WHITE, 2.6);
    s += C(22.6, 14.4, 2.2, WHITE, 1.6) + C(24.6, 16.4, 2.2, WHITE, 1.6) + C(32.4, 3.6, 2.2, WHITE, 1.6) + C(34.4, 5.6, 2.2, WHITE, 1.6);
    s += L('M24 15 L33 5', WHITE, 2.6);
    return s;
  },

  /* ---------- blocking furniture: tall, solid, standing on a shadow ---------- */

  // overstuffed bookshelf leaning over, books falling out of the top
  regal() {
    let s = shadow(19, 15);
    let g = '';
    g += R(6, 6, 26, 31, 1.5, '#8E4E22', W);
    g += R(9, 9, 20, 11, 0, '#3E2410', 0) + R(9, 23, 20, 11, 0, '#3E2410', 0);
    g += L('M6 21.5 L32 21.5', INK, 2.6);
    const books = [[9.3, 10, 4.2, RED], [13.7, 11.5, 3.6, SKY], [17.5, 9.5, 4.2, CHEESE], [22, 11, 3.4, GAS], [25.6, 10.5, 3.2, PINK],
                   [9.3, 24.5, 4, PURPLE], [13.5, 23.5, 4.2, ORANGE], [18, 25.5, 3.6, TEAL]];
    books.forEach(([x, y, w, c]) => { g += R(x, y, w, (y < 21 ? 20 : 34) - y, 0.6, c, 1.4); });
    g += P('M21.8 34 L27.5 25 L30.4 26.6 L25.4 34 Z', RED, 1.4);
    g += R(8.5, 2.6, 15, 3.4, 0.8, SKY, 1.6) + R(10.5, -0.6, 11, 3.2, 0.8, GAS, 1.6);
    s += `<g transform="rotate(5 19 37)">${g}</g>`;
    s += `<g transform="rotate(35 34 8)">${R(31.5, 3, 5, 9, 0.8, CHEESE, 1.8)}</g>`;
    s += L('M36.5 15.5 L38 18.5 M33.5 16.5 L34 19.5', INK, 1.6);
    return s;
  },
  // icy-blue fridge, frosted cap with icicles, scowling face, humming
  kuehlschrank() {
    let s = shadow(20, 13);
    s += L('M10 36 L10 38.4 M30 36 L30 38.4', INK, 2.6);
    s += R(8.5, 3.5, 23, 33, 3.5, '#9FDDFF', W);
    s += L('M8.5 13 L31.5 13', INK, 2.3);
    s += L('M27.5 6.5 L27.5 10', INK, 2.6);
    s += L('M28 16 L28 23', INK, 2.6);
    s += L('M11.5 16.5 L11.5 32', '#D6F1FF', 1.8);
    s += P('M7 5.5 Q9 0.8 13.5 2.4 Q17 0.2 20.5 2.2 Q24.5 0.2 27.5 2.2 Q32 1 33 5.5 L31 8.5 L29.5 5.8 L27.5 10 L25.4 6 L23 8.5 L20.5 5.8 L18 9.5 L15.8 5.8 L13.4 8.2 L11.2 5.8 L9.4 8.8 Z', WHITE, 1.8);
    s += goggle(15, 19.5, 2.9, 0.8, 0.9) + goggle(22.5, 19.5, 2.9, -0.8, 0.9);
    s += L('M11.4 14.8 L17.6 17.4 M26.1 14.8 L19.9 17.4', INK, 2.4);
    s += R(13, 25.5, 12, 5, 1.8, WHITE, 1.9);
    s += L('M16 25.5 L16 30.5 M19 25.5 L19 30.5 M22 25.5 L22 30.5', INK, 1.4);
    s += C(28, 30, 1.9, RED, 1.4);
    s += L('M5 15 Q3 17 5 19 Q7 21 5 23 M35 15 Q37 17 35 19 Q33 21 35 23', INK, 1.8);
    return s;
  },
  // stone fireplace with flames roaring out of the opening
  kamin() {
    let s = shadow(20, 17);
    s += R(4.5, 9.5, 31, 27.5, 1, '#B4ABC2', W);
    s += L('M4.5 17 L10.5 17 M29.5 17 L35.5 17 M4.5 24 L10.5 24 M29.5 24 L35.5 24 M4.5 31 L10.5 31 M29.5 31 L35.5 31 M7.5 9.5 L7.5 17 M32.5 17 L32.5 24', '#857C93', 1.5);
    s += R(1.5, 5, 37, 5.5, 1.5, '#7A3B1E', W);
    s += P('M10.5 37 L10.5 24 Q10.5 15.5 20 15.5 Q29.5 15.5 29.5 24 L29.5 37 Z', '#241A20', W);
    s += P('M9 35.5 Q5.5 27 11 20.5 Q11.5 25 14.5 25.5 Q12.5 17 19 10.5 Q19 18 22 19 Q23 13.5 27.5 11 Q25.5 19 28.5 23.5 Q30.5 21.5 31 18 Q35 26.5 31 35.5 Z', RED, 2.2);
    s += P('M12.5 35.5 Q10.5 29 14.5 25.5 Q15.5 28.5 18 28.5 Q17 22 21.5 18.5 Q21.5 24 25.5 27.5 Q28.5 30.5 27 35.5 Z', ORANGE, 1.6);
    s += P('M16 35.5 Q15 31.5 18 29.5 Q19 31.5 21 31 Q23.5 33 22.5 35.5 Z', CHEESE, 0);
    s += L('M11.5 35.8 L28.5 35.8', '#6E3418', 3);
    s += C(7, 3, 1.1, CHEESE) + C(33.5, 2.2, 1.3, CHEESE) + C(15.5, 7.3, 0.9, CHEESE);
    return s;
  },
  // dinner table with a checked orange cloth, a roast chicken and a candle
  tisch() {
    let s = shadow(20, 17);
    s += L('M8.5 26 L7.5 36.5 M31.5 26 L32.5 36.5', INK, 5.4) + L('M8.5 26 L7.5 36.5 M31.5 26 L32.5 36.5', '#8B5A2B', 2.6);
    const cloth = 'M2.5 15 L37.5 15 L37.5 27 Q34.6 30 31.7 27 Q28.8 30 25.9 27 Q23 30 20 27 Q17 30 14.1 27 Q11.2 30 8.3 27 Q5.4 30 2.5 27 Z';
    s += P(cloth, ORANGE, 0);
    for (let c = 0; c < 6; c++) for (let r = 0; r < 2; r++) {
      if ((c + r) % 2) s += R(f1(2.5 + c * 35 / 6), 15 + r * 6, f1(35 / 6), 6, 0, '#FFF3D6', 0);
    }
    s += P(cloth, 'none', W);
    s += L('M2.5 21 L37.5 21', '#C9551A', 1);
    // roast chicken
    s += E(13, 11.5, 7.5, 4.6, '#C9772F', 2.2);
    s += L('M9 9.5 Q12 7.8 15 8.6', '#F2B36B', 1.8);
    s += L('M19 9 L22.5 5.5', INK, 4.4) + L('M19 9 L22.5 5.5', '#C9772F', 2);
    s += C(23.2, 4.7, 1.8, WHITE, 1.4);
    // candle
    s += R(27.5, 6.5, 4, 8.5, 0.8, WHITE, 1.9);
    s += P('M29.5 0.8 Q32.3 3.8 29.5 5.6 Q26.7 3.8 29.5 0.8 Z', CHEESE, 1.5);
    return s;
  },
  // mustard grandfather clock with a cross-eyed googly face and a moustache
  uhr() {
    let s = shadow(20, 12.5);
    s += P('M11.5 19 L28.5 19 L28.5 33.5 L11.5 33.5 Z', '#E8A317', W);
    s += R(9.5, 33, 21, 4.2, 1.2, '#B87A0A', W);
    s += P('M7 21 L7 11.5 Q7 2.8 20 2.8 Q33 2.8 33 11.5 L33 21 Z', '#E8A317', W);
    s += P('M17.5 3.3 L20 0.3 L22.5 3.3 Z', '#B87A0A', 1.6);
    s += C(20, 12.3, 8.6, '#FFF8E6', 2.2);
    s += L('M20 4.8 L20 6.3 M27.5 12.3 L26 12.3 M12.5 12.3 L14 12.3', '#B87A0A', 1.4);
    s += C(16.6, 10.8, 2.7, WHITE, 1.3) + C(17.6, 11.4, 1.3, INK);
    s += C(23.4, 10.8, 2.7, WHITE, 1.3) + C(22.5, 10.2, 1.3, INK);
    s += L('M15.5 16.6 Q18 14.6 20 16 Q22 14.6 24.5 16.6', INK, 1.8);
    s += R(15, 21.5, 10, 10.5, 1.5, '#5C3A1A', 2);
    s += L('M20 22 L22 28', '#C9C3D3', 1.6);
    s += C(22.4, 28.8, 2.4, CHEESE, 1.4);
    s += L('M4 24.5 Q2.5 27 4 29.5 M36 24.5 Q37.5 27 36 29.5', INK, 1.8);
    return s;
  },
  // knight armour with a dark visor (something peeks out), droopy plume, halberd
  ruestung() {
    let s = shadow(20, 15);
    s += L('M34 4 L34 37', INK, 4.4) + L('M34 4 L34 37', '#8B5A2B', 2.2);
    s += P('M34 1 L36 6 L32 6 Z', '#C9CED8', 1.6);
    s += P('M34 7 Q39.5 9 38.5 15 L34 13.5 Z', '#C9CED8', 1.8);
    s += R(8, 33.5, 24, 4, 1, '#7A4A22', 2.2);
    s += P('M11 22 L29 22 Q30.5 30 26 33.5 L14 33.5 Q9.5 30 11 22 Z', '#C9CED8', W);
    s += L('M20 23 L20 33', '#8F95A3', 1.8);
    s += E(9.5, 23.5, 4, 3.4, '#C9CED8', 2.2) + E(30.5, 23.5, 4, 3.4, '#C9CED8', 2.2);
    s += C(33.5, 27, 2.4, '#C9CED8', 1.8);
    s += P('M11 18 Q11 6 20 6 Q29 6 29 18 L29 20 Q20 23.5 11 20 Z', '#C9CED8', W);
    s += R(12.5, 11, 15, 5, 2.2, INK, 0);
    s += C(16.7, 13.5, 1.5, WHITE) + C(23.3, 13.5, 1.5, WHITE);
    s += L('M15 18.5 L15 20.5 M18.3 19 L18.3 21.5 M21.7 19 L21.7 21.5 M25 18.5 L25 20.5', '#5A5F6C', 1.4);
    s += L('M13.5 9.5 Q16 7.5 19 7.8', WHITE, 1.8);
    s += P('M20 7 Q16 -0.5 7.5 1.8 Q2.5 3.5 3.5 10.5 Q6.5 6.5 10 7 Q7 9.5 6.5 14.5 Q12 8.5 20 7.5 Z', RED, 1.9);
    return s;
  },
  // potted jungle plant whose top leaf is a grinning flytrap
  pflanze() {
    let s = shadow(20, 11);
    s += P('M20 25 Q8 25 2.5 17 Q12 14.5 20 24 Z', '#2F8F2A', 2.2);
    s += P('M20 25 Q32 25 37.5 17 Q28 14.5 20 24 Z', '#2F8F2A', 2.2);
    s += P('M19 25 Q9 20 6 10 Q15 10 19.5 23 Z', '#4CAF3A', 2.2);
    s += P('M21 25 Q31 20 34 10 Q25 10 20.5 23 Z', '#4CAF3A', 2.2);
    s += L('M20 24.5 L20 17', '#2F8F2A', 3);
    s += L('M5.5 18 L17 23 M34.5 18 L23 23 M8.5 12 L18 22 M31.5 12 L22 22', '#2A6E22', 1.2);
    s += C(20, 10.5, 7.8, '#86E05A', W);
    s += C(15.5, 6.5, 1.1, '#C8F2A8') + C(25, 6, 1.3, '#C8F2A8');
    s += P('M13 10.5 Q20 21 27 10.5 Z', '#B0213A', 1.8);
    s += P('M14.3 10.7 L15.8 13.4 L17.4 10.7 L19 13.6 L20.6 10.7 L22.2 13.6 L23.8 10.7 L25.6 13 L26 10.7 Z', WHITE, 1);
    s += drop(24, 16.5, 3.4, '#BDEBFF', 1.2);
    s += P('M10.5 26 L29.5 26 L27.5 37 L12.5 37 Z', '#D9663A', W);
    s += R(8.5, 23.5, 23, 4.5, 1.5, '#F08A50', W);
    return s;
  },
  // bulging wine barrel, hoops straining, leaking red wine into a puddle
  fass() {
    let s = '';
    s += P('M8 36 Q8 33.5 18 34 Q36 33 37 36.5 Q36.5 39 22 39 Q8 39 8 36 Z', '#9B1B4A', 2);
    s += P('M11 3.5 L29 3.5 Q38 19 29 35.5 L11 35.5 Q2 19 11 3.5 Z', '#B5562E', W);
    s += L('M15.5 4 Q11 19.5 15.5 35 M20 4 L20 35 M24.5 4 Q29 19.5 24.5 35', '#7A331A', 1.5);
    s += L('M8.6 10 Q20 12.8 31.4 10 M5.3 19.5 Q20 22.5 34.7 19.5 M8.6 29.5 Q20 32.3 31.4 29.5', INK, 3.6);
    s += L('M8.6 10 Q20 12.8 31.4 10 M5.3 19.5 Q20 22.5 34.7 19.5 M8.6 29.5 Q20 32.3 31.4 29.5', '#6A6474', 1.6);
    s += E(20, 3.6, 9, 1.8, '#D08050', 2);
    s += R(17, 24, 6, 3.4, 1, '#E0A800', 1.6);
    s += drop(20, 28.5, 4.5, '#C2185B') + drop(20.5, 33.5, 2.6, '#C2185B', 1.2);
    s += L('M33.2 15 L35.8 13.6 M33.6 17 L36.6 17.5', INK, 1.5);
    s += drop(37.5, 11.5, 3.6, '#C2185B', 1.3) + drop(3, 23, 3.4, '#C2185B', 1.3);
    s += L('M5.8 21 L3.4 19.4', INK, 1.5);
    s += `<g transform="rotate(25 29 1.8)">${R(26.5, 0, 5, 3.6, 1, '#E0B070', 1.6)}</g>`;
    s += L('M24.5 0.8 L25.8 2 M33.5 4.5 L35 5.2', INK, 1.4);
    return s;
  },
  // red retro stove with a glowing oven and a pot boiling over, lid rattling
  herd() {
    let s = shadow(20, 16);
    s += L('M8 36 L8 38.4 M32 36 L32 38.4', INK, 2.6);
    s += R(4.5, 15, 31, 21.5, 3, RED, W);
    s += L('M4.5 20.5 L35.5 20.5', INK, 2.2);
    [10.5, 16.5, 23.5, 29.5].forEach(x => { s += C(x, 17.8, 1.6, WHITE, 1.4); });
    s += R(9, 23.5, 22, 10, 2.5, '#2A1E24', 2);
    s += P('M11.5 32 Q13 27 16 29.5 Q18 25.5 21 29 Q24 26 26 29.5 Q28 28 28.5 32 Z', ORANGE, 0);
    s += L('M12 26 L16 26', '#6A6270', 1.4);
    // pot
    s += R(9.5, 6.5, 21, 8.5, 2.5, '#C9C3D3', W);
    s += R(6.5, 8, 4, 3, 1.3, '#C9C3D3', 1.8) + R(29.5, 8, 4, 3, 1.3, '#C9C3D3', 1.8);
    s += P('M10.5 7.5 C10.5 11.5 14 11.5 14 8 L24.5 8 C24.5 12.5 28 12.5 28 8 Z', '#86C23A', 1.6);
    s += `<g transform="rotate(-12 20 6)">${P('M10.5 6.5 Q20 1.5 29.5 6.5 Z', '#ECE8F2', 2.2) + C(20, 2.6, 1.6, INK)}</g>`;
    s += L('M5 3.5 L7.5 5 M33 2 L35 4', INK, 1.6);
    s += C(31.5, 6, 1.4, '#86C23A', 1.2) + C(8, 4.5, 1, '#86C23A', 1);
    return s;
  },
  // black grand piano, lid propped up, keyboard grin, musical notes escaping
  fluegel() {
    let s = shadow(20, 17);
    s += L('M7 27 L7.5 36 M33 27 L32.5 36 M20 27 L20 35.5', INK, 3);
    s += C(7.5, 36.4, 1.5, CHEESE, 1.2) + C(32.5, 36.4, 1.5, CHEESE, 1.2) + C(20, 36, 1.5, CHEESE, 1.2);
    s += L('M28 15 L24 5.5', '#B0A8B8', 1.8);
    s += P('M4 15 L36.5 15 L37.5 3.5 Q28 2 19 6 Q12 9.5 4 15 Z', '#221E24', W);
    s += L('M10 12.5 Q20 6.5 33 5.5', '#6A6270', 1.6);
    s += R(2.5, 14, 35, 8.5, 2, '#221E24', W);
    s += L('M6 17 L22 17', '#6A6270', 1.6);
    s += R(2.5, 21.5, 35, 6.5, 1.2, WHITE, 2.2);
    [6, 9.5, 15, 18.5, 22, 27.5, 31].forEach(x => { s += R(x, 21.5, 2.2, 3.8, 0.4, INK, 0); });
    s += L('M8.5 0.5 L8.5 7 M14 2.5 L14 9', INK, 1.6);
    s += E(7, 7.4, 2, 1.5, PINK, 1.5, INK, -20) + E(12.5, 9.3, 2, 1.5, CHEESE, 1.5, INK, -20);
    s += L('M8.5 0.5 Q11 1 11.5 3.5', INK, 1.6);
    return s;
  }
};


FD.artProps = { SNACKS, OBJECTS };
})();
