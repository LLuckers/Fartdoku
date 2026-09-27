/* Fartdoku - SVG artwork (Exploding-Kittens-ish: chunky ink outlines, flat bright fills).
 * Plain browser script, also loadable in Node. All functions return SVG markup strings.
 * No ids / url(#) references, so any number of copies can live on one page. */
(function(){
'use strict';
const FD = globalThis.Fartdoku = globalThis.Fartdoku || {};

const INK = '#16121A';
const FUR = '#221E24';
const MUZZLE = '#332D36';
const WRINKLE = '#3C3640';
const EAR_PINK = '#FF8FB8';
const PINK = '#FF3E8A', CHEESE = '#FFD23F', GAS = '#86E05A', GAS_HI = '#B8F28F', SKY = '#3EC1F3',
      ORANGE = '#FF7A2F', RED = '#FF4B4B', TEAL = '#2EC4B6', PURPLE = '#7B61FF', WHITE = '#FFFFFF';

const svg = (vb, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;
// stroke attributes
const S = (w, c) => `stroke="${c || INK}" stroke-width="${w == null ? 3 : w}" stroke-linejoin="round" stroke-linecap="round"`;
const P = (d, fill, w, c) => `<path d="${d}" fill="${fill}" ${w === 0 ? '' : S(w, c)}/>`;
const L = (d, c, w) => `<path d="${d}" fill="none" ${S(w == null ? 3 : w, c || INK)}/>`;
const C = (cx, cy, r, fill, w, c) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${w === 0 || w == null ? '' : S(w, c)}/>`;
const E = (cx, cy, rx, ry, fill, w, c, rot) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${w === 0 || w == null ? '' : S(w, c)}${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const R = (x, y, w, h, rx, fill, sw, c) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${sw === 0 || sw == null ? '' : S(sw, c)}/>`;
const f1 = n => Math.round(n * 10) / 10;

/* Puffy blob made of overlapping circles with a single outer outline:
 * pass 1 = slightly bigger ink circles, pass 2 = fill circles on top. */
function puffs(lobes, fill, ow) {
  const o = ow == null ? 3 : ow;
  let s = '';
  for (const [x, y, r] of lobes) s += C(x, y, r + o, INK);
  for (const [x, y, r] of lobes) s += C(x, y, r, fill);
  return s;
}
function heartPath(cx, cy, s) {
  return `M${cx} ${f1(cy + s * 0.95)} C${f1(cx - s * 1.35)} ${f1(cy + s * 0.05)} ${f1(cx - s * 1.05)} ${f1(cy - s * 1.05)} ${cx} ${f1(cy - s * 0.42)} ` +
         `C${f1(cx + s * 1.05)} ${f1(cy - s * 1.05)} ${f1(cx + s * 1.35)} ${f1(cy + s * 0.05)} ${cx} ${f1(cy + s * 0.95)} Z`;
}
function sparkle(x, y, s, fill) {
  const k = s * 0.28;
  return P(`M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z`,
    fill || CHEESE, 2);
}
// wavy green stink line (ink under-stroke so it reads on light backgrounds)
function stink(d, w) {
  const ww = w || 2.2;
  return `<path d="${d}" fill="none" ${S(ww + 2.4)}/>` + `<path d="${d}" fill="none" ${S(ww, GAS)}/>`;
}

/* ------------------------------------------------------------------ */
/* FRENCHIE                                                            */
/* ------------------------------------------------------------------ */
const EAR_L = 'M21 60 C8 44 5 27 10 13 Q15 3 27 8 C41 15 51 27 54 42 Z';
const EAR_L_IN = 'M25 50 C17 39 14 28 17 18 Q20 12 27 15 C36 20 43 29 46 40 Z';
// right ear with a bite taken out (bruno)
const EAR_R_NOTCH = 'M99 60 C110 46 114 36 114 31 L106.5 27.5 L112.8 21.5 C112.3 17 111.5 15 110 13 Q105 3 93 8 C79 15 69 27 66 42 Z';
const HEAD = 'M60 33 C89 33 107 47 107 68 C107 92 90 104 60 104 C30 104 13 92 13 68 C13 47 31 33 60 33 Z';
const MUZ = 'M60 69 C75 69 85 77 85 88 C85 98 73 102 60 102 C47 102 35 98 35 88 C35 77 45 69 60 69 Z';
const NOSE = 'M50.5 75.5 Q60 70 69.5 75.5 Q71.5 81 64.5 84.5 Q60 86.5 55.5 84.5 Q48.5 81 50.5 75.5 Z';
const EYE_L = [41, 63], EYE_R = [79, 63];

function eye(cx, cy, mood) {
  const dx = mood === 'guilty' ? -3 : (cx < 60 ? 0.6 : -0.6);
  const dy = mood === 'smug' ? 2.5 : mood === 'guilty' ? 0 : 1;
  const ix = cx + dx, iy = cy + dy;
  let s = C(cx, cy, 11.5, WHITE, 3);
  s += C(ix, iy, 8, '#5B3A28');
  s += C(ix, iy, 5.2, '#0B080D');
  if (mood === 'smug') {
    // heavy half-closed lid, slightly slanted
    const t = cx < 60 ? -1 : 1;
    s += P(`M${cx - 13} ${cy + 1 - t} L${cx - 13} ${cy - 14} L${cx + 13} ${cy - 14} L${cx + 13} ${cy + 1 + t} Z`, FUR, 0);
    s += L(`M${cx - 12} ${cy + 1 - t} Q${cx} ${cy - 1} ${cx + 12} ${cy + 1 + t}`, INK, 3.2);
    s += L(`M${cx - 10} ${cy - 2 - t} Q${cx} ${cy - 4.5} ${cx + 10} ${cy - 2 + t}`, '#6A6270', 2);
    s += C(ix - 3, iy + 1.5, 1.8, WHITE);
  } else {
    s += C(ix - 3, iy - 3.2, 2.8, WHITE);
    s += C(ix + 2.8, iy + 2.6, 1.3, WHITE);
  }
  return s;
}

function faceBase(mood, opts, notchEar) {
  let s = '';
  // ears
  s += P(EAR_L, FUR, 3) + P(EAR_L_IN, EAR_PINK, 0) + L('M26 45 C21 37 19 29 20 21', '#FFB8D2', 2);
  if (notchEar) {
    s += P(EAR_R_NOTCH, FUR, 3);
    s += `<g transform="matrix(-1 0 0 1 120 0)">${P(EAR_L_IN, EAR_PINK, 0)}</g>`;
  } else {
    s += `<g transform="matrix(-1 0 0 1 120 0)">${P(EAR_L, FUR, 3) + P(EAR_L_IN, EAR_PINK, 0) + L('M26 45 C21 37 19 29 20 21', '#FFB8D2', 2)}</g>`;
  }
  // head
  s += P(HEAD, FUR, 3);
  s += L('M24 52 Q31 42 43 38', '#4A4450', 3);            // sheen
  s += L('M48 44 Q60 39.5 72 44', WRINKLE, 2.6);           // forehead wrinkles
  s += L('M51.5 50 Q60 46.5 68.5 50', WRINKLE, 2.4);
  s += L('M60 53 L60 59', WRINKLE, 2.2);
  // muzzle + jowl hint + cheeks
  s += P(MUZ, MUZZLE, 0);
  s += L('M52 70.5 Q60 68 68 70.5', WRINKLE, 2);
  s += E(25, 80, 6, 3.4, EAR_PINK) .replace('/>', ' opacity="0.35"/>');
  s += E(95, 80, 6, 3.4, EAR_PINK) .replace('/>', ' opacity="0.35"/>');
  // eyes
  s += eye(EYE_L[0], EYE_L[1], mood) + eye(EYE_R[0], EYE_R[1], mood);
  // brows
  if (mood === 'guilty') {
    s += L('M29 49 Q38 47.5 47 42', '#9A92A0', 3.4);
    s += L('M91 49 Q82 47.5 73 42', '#9A92A0', 3.4);
  } else if (mood === 'smug') {
    s += L('M30 47 Q39 45.5 49 47', '#9A92A0', 3.2);
    s += L('M71 44 Q80 38.5 90 42.5', '#9A92A0', 3.2);
  }
  // nose
  s += P(NOSE, '#0B080D', 2.5);
  s += E(55.5, 75.8, 3, 1.5, '#9A92A0', 0, 0, -12);
  s += C(62.5, 75, 1, '#6A6270');
  // tongue (under the mouth lines)
  if (opts.tongue) {
    s += P('M53.5 89.5 Q52.5 101.5 60 101.5 Q67.5 101.5 66.5 89.5 Z', '#FF6FA5', 2.5);
    s += L('M60 92 L60 97.5', '#D94B80', 2);
  }
  // mouth
  const M = '#0B080D';
  if (mood === 'guilty') {
    s += L('M60 85 L60 88', M, 3);
    s += L('M46 92 Q50 88.5 54 91.5 Q58 94.5 62 91.5 Q66 88.5 70 91.5 Q72 93 74 92', M, 3);
  } else if (mood === 'smug') {
    s += L('M60 85 L60 88.5 M60 88.5 Q55 92.5 49 90.5 M60 88.5 Q69 94 77 85.5', M, 3);
  } else {
    s += L('M60 85 L60 88.5 M60 88.5 Q54 95 46.5 90.5 M60 88.5 Q66 95 73.5 90.5', M, 3);
  }
  // guilty sweat drop
  if (mood === 'guilty') {
    s += P('M103 34 Q110 45 106.5 50 Q103 53.5 99.5 50 Q96 45 103 34 Z', SKY, 2.5);
    s += E(101.5, 46, 1.3, 2.4, WHITE, 0, 0, 20);
  }
  return s;
}

// hanging curve under the chin, used by chains & necklaces
function chinCurve(t) {
  return [30 + 60 * t, 96 + 11 * Math.sin(Math.PI * t)];
}

const ACC = {
  pierre() {
    let s = '';
    // beret, tilted to the left
    s += `<g transform="rotate(-12 60 34)">`;
    s += P('M31 40 C27 27 47 17 68 17 C89 17 98 28 90 37 C79 45 45 47 31 40 Z', RED, 3);
    s += L('M37 37 C52 41 74 40 86 34', '#C8323A', 2.4);
    s += L('M63 17 L64.5 10', INK, 3.4);
    s += L('M40 27 Q48 21 58 20', '#FF8A8A', 2.4);
    s += `</g>`;
    // striped neckerchief
    s += P('M34 99 Q60 109 86 99 L60 119 Z', RED, 3);
    s += L('M42.5 104.8 Q60 110.4 77.5 104.8', WHITE, 2.4);
    s += L('M50 110.3 Q60 113 70 110.3', WHITE, 2.4);
    s += L('M56 115.3 L64 115.3', WHITE, 2.2);
    s += C(60, 104.5, 4, RED, 2.5);
    return s;
  },
  pupsalot() {
    let s = '';
    s += `<g transform="rotate(-7 60 38)">`;
    s += P('M42.5 39 L40 8.5 Q60 3.5 80 8.5 L77.5 39 Z', '#4A4450', 3);
    s += P('M42 30 L78 30 L77.4 38 L42.6 38 Z', '#FFB627', 2.5);
    s += P('M26 40.5 Q60 29 94 40.5 Q60 49 26 40.5 Z', '#4A4450', 3);
    s += L('M46 12 L47.5 27', '#6A6275', 2.6);
    s += `</g>`;
    // monocle on the right eye + chain
    s += L('M92 71 Q97 84 94 94 Q92 101 97 108', INK, 4.4);
    s += `<path d="M92 71 Q97 84 94 94 Q92 101 97 108" fill="none" stroke="${CHEESE}" stroke-width="2.2" stroke-dasharray="2.6 2.2" stroke-linecap="round"/>`;
    s += C(EYE_R[0], EYE_R[1], 14.5, 'none', 6.4, INK);
    s += C(EYE_R[0], EYE_R[1], 14.5, 'none', 3, CHEESE);
    s += L('M70 52.5 Q75 50.5 80 50.6', '#FFF2B0', 1.6);
    return s;
  },
  bruno() {
    let s = '';
    // tough-guy scar over the left eye
    s += L('M31 44 L39 57', '#C9A6B4', 2.6);
    s += L('M32.5 49.5 L37 48 M34.5 53 L39 51.5', '#C9A6B4', 1.8);
    // chunky gold chain
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const [x, y] = chinCurve(t);
      const a = Math.cos(Math.PI * t) * -20 + (i % 2 ? 90 : 0);
      s += E(f1(x), f1(y), 4.4, 3.2, CHEESE, 2.2, INK, f1(a));
      s += E(f1(x), f1(y), 1.8, 0.9, '#C99A00', 0, 0, f1(a));
    }
    s += L('M60 107 L60 110', INK, 3);
    s += C(60, 113, 6.5, TEAL, 2.6);
    s += C(60, 113, 3, 'none', 1.8, CHEESE);
    s += C(57.8, 110.8, 1.3, WHITE);
    return s;
  },
  mimi() {
    let s = '';
    // pearls
    const n = 11;
    for (let i = 0; i <= n; i++) {
      const [x, y] = chinCurve(i / n);
      s += C(f1(x), f1(y + 1), 3.3, WHITE, 1.8);
      s += C(f1(x - 1), f1(y), 0.9, '#E6E0F0');
    }
    // big pink bow at the base of the left ear
    s += `<g transform="rotate(-24 34 40)">`;
    s += P('M34 40 C27 27 13 27 15 40 C13 53 27 53 34 40 Z', PINK, 3);
    s += P('M34 40 C41 27 55 27 53 40 C55 53 41 53 34 40 Z', PINK, 3);
    s += L('M20 36 Q24 33 28 36', '#FF9CC3', 2.2);
    s += L('M39 36 Q43 33 47 36', '#FF9CC3', 2.2);
    s += E(34, 40, 5, 6, '#E0306F', 2.6);
    s += `</g>`;
    return s;
  },
  gaston() {
    let s = '';
    s += P('M40 41 L42 25 L78 25 L80 41 Q60 45 40 41 Z', WHITE, 3);
    s += L('M50 28 L49.5 40 M60 28 L60 42 M70 28 L70.5 40', '#CFC8D8', 2);
    s += puffs([[44, 21, 8.5], [55, 15, 9.5], [67, 15.5, 9.5], [77, 22, 8], [60, 23, 9]], WHITE, 3);
    s += L('M47 15.5 Q50.5 10.5 55.5 10.5', '#E4DEEC', 2.2);
    // small orange neckerchief
    s += P('M42 100 Q60 107 78 100 L60 116 Z', ORANGE, 3);
    s += C(60, 104, 3.8, ORANGE, 2.5);
    s += L('M50 106 Q60 110 70 106', '#FFA66E', 2);
    return s;
  },
  baron() {
    let s = '';
    s += `<g transform="rotate(9 60 36)">`;
    s += P('M39 41 L36 15 L48.5 27 L60 10 L71.5 27 L84 15 L81 41 Q60 45 39 41 Z', CHEESE, 3);
    s += P('M38.6 35 Q60 39 81.4 35', 'none', 2.4);
    s += C(36, 14, 3.2, CHEESE, 2.4) + C(60, 9.5, 3.4, CHEESE, 2.4) + C(84, 14, 3.2, CHEESE, 2.4);
    s += E(49, 39, 3.3, 2.5, PURPLE, 2) + E(60, 40, 4, 3, PURPLE, 2) + E(71, 39, 3.3, 2.5, PURPLE, 2);
    s += C(58.8, 38.9, 1, WHITE);
    s += L('M43 30 L42 22', '#FFF2B0', 2.2);
    s += `</g>`;
    return s;
  },
  coco() {
    let s = '';
    s += L('M26 59 L12 54', INK, 4) + L('M94 59 L108 54', INK, 4);
    s += L('M50 58 Q60 52 70 58', INK, 4);
    s += P(heartPath(40, 62, 16.5), SKY, 3.4);
    s += P(heartPath(80, 62, 16.5), SKY, 3.4);
    // glints
    s += L('M28 57 Q30 51 36 50', WHITE, 3) + C(33, 61, 1.6, WHITE);
    s += L('M68 57 Q70 51 76 50', WHITE, 3) + C(73, 61, 1.6, WHITE);
    return s;
  }
};

function frenchieInner(dogId, opts) {
  opts = opts || {};
  const mood = opts.mood === 'guilty' || opts.mood === 'smug' ? opts.mood : 'normal';
  let s = faceBase(mood, opts, dogId === 'bruno');
  if (opts.bowtie) {
    s += P('M60 104 L45 96 Q42 104 45 112 Z', PINK, 3);
    s += P('M60 104 L75 96 Q78 104 75 112 Z', PINK, 3);
    s += L('M48 100 L48 108 M72 100 L72 108', '#FF8FB8', 2);
    s += E(60, 104, 4.4, 5, '#E0306F', 2.6);
  }
  const acc = Object.prototype.hasOwnProperty.call(ACC, dogId) ? ACC[dogId] : null;
  if (acc) s += acc();
  return s;
}

function frenchie(dogId, opts) {
  return svg('0 0 120 120', frenchieInner(dogId, opts || {}));
}

/* ------------------------------------------------------------------ */
/* SNACKS (40x40)                                                      */
/* ------------------------------------------------------------------ */
const SNACKS = {
  kaese() {
    let s = '';
    s += stink('M12 13 Q9.5 10.5 12 8 Q14.5 5.5 12 3');
    s += stink('M21 11.5 Q18.5 9 21 6.5 Q23.5 4 21 2.5');
    // wedge: top face + front face
    s += P('M4 24 L28 13 L37 20 L37 34 L4 34 Z', '#F4DE7A', 2.5);
    s += P('M4 24 L28 13 L37 20 Z', '#FFEFA8', 2.5);
    s += P('M4 24 L37 20 L37 34 L4 34 Z', '#F4DE7A', 2.5);
    s += E(12, 29, 2.6, 2, '#D9B640') + E(22, 26, 1.9, 1.5, '#D9B640') + E(30, 30, 2.2, 1.7, '#D9B640');
    s += E(27, 17, 1.8, 1, '#E6C95A');
    s += L('M8 32 L33 32', '#E0C154', 1.5);
    return s;
  },
  doener() {
    let s = '';
    s += L('M20 2 L20 38', '#8C8494', 2.6);
    s += P('M11 8 L29 8 Q28 21 25 33 L15 33 Q12 21 11 8 Z', '#A0522D', 2.5);
    s += L('M12.5 13 Q20 15.5 27.5 13 M13.5 19 Q20 21.5 26.5 19 M14.6 25 Q20 27.5 25.4 25', '#6E3418', 1.8);
    s += L('M14 10.5 L14.5 16 M16 22 L16.4 27', '#D08450', 1.6);
    s += E(20, 7, 11, 2.8, '#B9B2C2', 2.5);
    s += E(20, 34.5, 7.5, 2.2, '#B9B2C2', 2.5);
    s += C(20, 3, 2, '#B9B2C2', 2);
    s += stink('M33 16 Q31 13.5 33 11 Q35 8.5 33 6', 1.8);
    return s;
  },
  pansen() {
    let s = '';
    s += P('M6 29 C2 20 9 12 17 14 C24 9 36 14 34 23 C38 31 29 37 19 35 C13 37 8 34 6 29 Z', '#D8CBB0', 2.5);
    const hex = (x, y) => `M${x - 3} ${y} L${x - 1.5} ${y - 2.6} L${x + 1.5} ${y - 2.6} L${x + 3} ${y} L${x + 1.5} ${y + 2.6} L${x - 1.5} ${y + 2.6} Z`;
    let d = '';
    [[12, 23], [18, 20], [24, 23], [30, 24], [15, 29], [21, 28], [27, 30]].forEach(([x, y]) => d += hex(x, y));
    s += `<path d="${d}" fill="#C4B596" stroke="#9E8E6E" stroke-width="1.3" stroke-linejoin="round"/>`;
    // fly with dotted path
    s += `<path d="M22 13 Q24 5 30 8" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="1.4 1.8" stroke-linecap="round"/>`;
    s += E(30, 4.6, 2.6, 1.7, '#DDF3FF', 1.4, INK, -25) + E(34.3, 4.6, 2.6, 1.7, '#DDF3FF', 1.4, INK, 25);
    s += C(32, 8, 2.6, INK);
    s += C(33, 7.2, 0.8, '#FF4B4B');
    s += stink('M7 16 Q5 13.5 7 11 Q9 8.5 7 6', 1.8);
    return s;
  },
  rosenkohl() {
    let s = '';
    const sprout = (x, y, r, fill, dark) =>
      C(x, y, r, fill, 2.5) +
      L(`M${x - r * 0.7} ${y - r * 0.2} Q${x - r * 0.1} ${y + r * 0.3} ${x + r * 0.3} ${y + r * 0.95}`, dark, 1.8) +
      L(`M${x + r * 0.75} ${y - r * 0.35} Q${x + r * 0.25} ${y + r * 0.1} ${x + r * 0.05} ${y + r * 0.9}`, dark, 1.8) +
      L(`M${x - r * 0.35} ${y - r * 0.8} Q${x + r * 0.1} ${y - r * 0.2} ${x - r * 0.05} ${y + r * 0.4}`, dark, 1.6) +
      E(x - r * 0.4, y - r * 0.45, r * 0.25, r * 0.15, '#C8F2A8', 0, 0, -35);
    s += sprout(13, 25, 9, '#6CC24A', '#3E8E2A');
    s += sprout(27, 27, 8.5, '#58B03A', '#337A22');
    s += L('M13 16 L12 13.5', '#3E8E2A', 2.4);
    s += stink('M20 12 Q17.5 9.5 20 7 Q22.5 4.5 20 2', 2);
    s += stink('M30 14 Q28 12 30 10 Q32 8 30 6', 1.8);
    return s;
  },
  bohnen() {
    let s = '';
    s += L('M12 12 Q9.5 9.5 12 7 Q14.5 4.5 12 2', '#B9B2C2', 2.4);
    s += L('M28 12 Q25.5 9.5 28 7 Q30.5 4.5 28 2', '#B9B2C2', 2.4);
    s += stink('M20 13 Q17.5 10.5 20 8 Q22.5 5.5 20 3', 2);
    s += P('M5 21 Q20 13 35 21 Z', '#C0622F', 2.5);
    [[11, 19, -20], [16.5, 17.2, 10], [22, 17, -8], [27.5, 18.5, 18], [14, 20.5, 30], [20, 20, 0], [25.5, 20.4, -25]]
      .forEach(([x, y, r]) => { s += E(x, y, 2.6, 1.7, '#7A3A1E', 1.2, INK, r); });
    s += P('M3.5 21 L36.5 21 Q35.5 35.5 20 35.5 Q4.5 35.5 3.5 21 Z', TEAL, 2.5);
    s += L('M8 26 Q20 30 32 26', '#7FE3D8', 2);
    return s;
  }
};

function snack(key) {
  const f = Object.prototype.hasOwnProperty.call(SNACKS, key) ? SNACKS[key] : null;
  return svg('0 0 40 40', f ? f() : C(20, 20, 12, '#CCCCCC', 2.5));
}

/* ------------------------------------------------------------------ */
/* FLOOR-PLAN OBJECTS (40x40)                                          */
/* ------------------------------------------------------------------ */
const W = 2.5; // stroke width for 40-box icons
const OBJECTS = {
  kissen() {
    let s = '';
    s += P('M6 8 Q20 12.5 34 8 Q29.5 20 34 32 Q20 27.5 6 32 Q10.5 20 6 8 Z', '#E0409A', W);
    s += L('M11 12.5 Q20 15 29 12.5', '#F57BBE', 2);
    s += L('M13 20 L27 20 M20 13 L20 27', '#B02A76', 1.4);
    [[20, 20], [13.5, 15], [26.5, 15], [13.5, 25], [26.5, 25]].forEach(([x, y]) => { s += C(x, y, 1.6, '#8E1F5E'); });
    [[6, 8], [34, 8], [34, 32], [6, 32]].forEach(([x, y]) => { s += C(x, y, 2.6, CHEESE, 1.8); });
    return s;
  },
  teppich() {
    let s = '';
    let fr = '';
    for (let x = 7; x <= 33; x += 3.25) fr += `M${f1(x)} 0.8 L${f1(x)} 4.5 M${f1(x)} 35.5 L${f1(x)} 39.2 `;
    s += L(fr, '#C9B28A', 1.6);
    s += R(4, 3.5, 32, 33, 2, ORANGE, W);
    s += R(8, 7.5, 24, 25, 1, 'none', 2, CHEESE);
    s += P('M20 11 L28 20 L20 29 L12 20 Z', '#E0521A', 2, '#9E3510');
    s += P('M20 15.5 L24.5 20 L20 24.5 L15.5 20 Z', CHEESE, 1.6, '#9E3510');
    s += C(11, 11, 1.4, CHEESE) + C(29, 11, 1.4, CHEESE) + C(11, 29, 1.4, CHEESE) + C(29, 29, 1.4, CHEESE);
    return s;
  },
  sessel() {
    let s = '';
    s += L('M10 33 L9 37 M30 33 L31 37', INK, 2.8);
    s += P('M9 23 Q8 6 20 6 Q32 6 31 23 Z', PURPLE, W);
    s += L('M14 11 Q20 8.5 26 11', '#A796FF', 2);
    s += P('M8 22 L32 22 L32 33 L8 33 Z', '#6A50E8', W);
    s += R(3, 16, 8, 18, 3.5, PURPLE, W);
    s += R(29, 16, 8, 18, 3.5, PURPLE, W);
    s += L('M12 25.5 L28 25.5', '#A796FF', 1.8);
    s += C(20, 15, 1.4, '#4A36B0');
    return s;
  },
  korb() {
    let s = '';
    s += E(20, 18, 16, 8.5, '#8B5A2B', W);
    s += E(20, 19.5, 12, 5.5, '#FF8FB8', 2);
    s += L('M12 18.5 Q20 16 28 18.5', '#FFC0D8', 1.6);
    s += P('M4 18 Q4 35 20 35 Q36 35 36 18 Q34 26 20 26 Q6 26 4 18 Z', '#C68642', W);
    s += L('M8 26 L10 33 M14 28 L15 34.5 M20 28.6 L20 35 M26 28 L25 34.5 M32 26 L30 33', '#8B5A2B', 1.5);
    s += L('M5.5 25 Q20 34 34.5 25', '#8B5A2B', 1.5);
    return s;
  },
  regal() {
    let s = '';
    s += R(5, 3, 30, 34, 1.5, '#A0662F', W);
    s += R(8, 6, 24, 12, 0, '#5C3A1A', 0) + R(8, 21, 24, 12.5, 0, '#5C3A1A', 0);
    s += L('M5 19.5 L35 19.5', INK, 2.2);
    const books = [[8.5, 7.5, 4, RED], [12.8, 9, 3.4, SKY], [16.6, 6.8, 4, CHEESE], [21, 8.5, 3.4, GAS], [24.8, 7.5, 3.2, PINK],
                   [8.5, 23.5, 3.6, PURPLE], [12.5, 22, 4, ORANGE], [17, 24, 3.4, TEAL], [21, 22.5, 3.8, RED]];
    books.forEach(([x, y, w, c]) => { s += R(x, y, w, (y < 19 ? 18 : 33.5) - y, 0.5, c, 1.3); });
    s += P('M25.5 33.5 L31.5 26 L33.5 27.5 L28 33.5 Z', CHEESE, 1.3);
    return s;
  },
  kuehlschrank() {
    let s = '';
    s += R(11, 3.5, 18, 33, 3, '#F4F2F8', W);
    s += L('M11 15 L29 15', INK, 2.2);
    s += L('M24.5 8 L24.5 12 M24.5 18.5 L24.5 25', INK, 2.6);
    s += L('M14 6.5 L14 12.5', '#D8D4E2', 1.6);
    s += L('M13 36.5 L13 38.5 M27 36.5 L27 38.5', INK, 2.2);
    s += L('M6.5 12 L4.5 14 L6.5 16 L4.5 18', SKY, 1.8);
    s += L('M33.5 20 L35.5 22 L33.5 24 L35.5 26', SKY, 1.8);
    s += C(20, 29, 2, CHEESE, 1.4);
    return s;
  },
  kamin() {
    let s = '';
    s += R(5, 9, 30, 28, 1, '#B8AFC4', W);
    s += L('M5 16 L35 16 M5 23 L10 23 M30 23 L35 23 M5 30 L10 30 M30 30 L35 30 M20 9 L20 16', '#8A8196', 1.4);
    s += R(2.5, 5, 35, 5, 1.5, '#8B5A2B', W);
    s += P('M11 37 L11 25 Q11 17 20 17 Q29 17 29 25 L29 37 Z', '#2A1E24', W);
    s += P('M14 35 Q12 28 17 23 Q17 27 19.5 27 Q18.5 21 23 18.5 Q22.5 24 26 28 Q27.5 32 26 35 Z', ORANGE, 1.8);
    s += P('M17.5 35 Q16.5 30.5 19.5 28 Q20.5 30.5 22 30 Q24 32 23 35 Z', CHEESE, 0);
    s += L('M13 35.5 L27 35.5', '#6E3418', 2.4);
    return s;
  },
  tisch() {
    let s = '';
    s += L('M8.5 20 L7 36 M31.5 20 L33 36', INK, 5.2);
    s += L('M8.5 20 L7 36 M31.5 20 L33 36', '#8B5A2B', 2.4);
    s += L('M14 20 L14 30 M26 20 L26 30', '#6E4420', 2.4);
    s += P('M3 13 L37 13 L37 20 L3 20 Z', '#B87333', W);
    s += L('M6 16.3 L22 16.3 M26 16.3 L33 16.3', '#D9975A', 1.6);
    return s;
  },
  uhr() {
    let s = '';
    s += P('M12 12 Q12 3 20 3 Q28 3 28 12 L28 37 L12 37 Z', '#9A5B2C', W);
    s += C(20, 11.5, 5.8, '#FFF8E6', 2.2);
    s += L('M20 11.5 L20 8 M20 11.5 L22.8 12.8', INK, 1.7);
    s += R(15.5, 20, 9, 13, 1.5, '#5C3A1A', 2);
    s += L('M20 21 L19 28', '#E0A800', 1.5);
    s += C(19, 29.5, 2.4, CHEESE, 1.3);
    s += L('M10.5 37 L29.5 37', INK, 3);
    return s;
  },
  ruestung() {
    let s = '';
    s += L('M20 26 L20 35', INK, 3.2);
    s += R(11, 34, 18, 4, 1.5, '#8B5A2B', 2.2);
    s += P('M20 1.5 Q23 4 21.5 8 L18.5 8 Q15 4 20 1.5 Z', RED, 1.8);
    s += P('M9 27 L9 16 Q9 6 20 6 Q31 6 31 16 L31 27 Q20 30 9 27 Z', '#C3C8D2', W);
    s += L('M20 6.5 L20 28.5', '#8F95A3', 1.8);
    s += R(11.5, 15.5, 17, 3.2, 1.2, INK, 0);
    s += L('M14 21.5 L14 25.5 M17 22 L17 26.5 M23 22 L23 26.5 M26 21.5 L26 25.5', '#5A5F6C', 1.4);
    s += L('M12.5 11 Q15 8.5 18 8.5', WHITE, 1.8);
    return s;
  },
  pflanze() {
    let s = '';
    s += P('M20 24 Q10 18 7 8 Q16 9 20 22 Z', '#4CAF3A', 2.2);
    s += P('M20 24 Q30 18 33 8 Q24 9 20 22 Z', '#4CAF3A', 2.2);
    s += P('M20 24 Q15 12 20 2.5 Q25 12 20 24 Z', '#6CC24A', 2.2);
    s += P('M20 25 Q9 25 4 18 Q13 16 20 24 Z', '#3E9A2E', 2.2);
    s += P('M20 25 Q31 25 36 18 Q27 16 20 24 Z', '#3E9A2E', 2.2);
    s += L('M20 6 L20 20 M11 11 L18 20 M29 11 L22 20', '#2E7A22', 1.2);
    s += P('M10 24 L30 24 L27.5 37 L12.5 37 Z', '#D2691E', W);
    s += R(8.5, 22.5, 23, 4.5, 1.5, '#E07B34', W);
    return s;
  },
  fass() {
    let s = '';
    s += P('M10.5 4 L29.5 4 Q35 20 29.5 36 L10.5 36 Q5 20 10.5 4 Z', '#A0522D', W);
    s += L('M15.5 4.5 Q13 20 15.5 35.5 M20 4.5 L20 35.5 M24.5 4.5 Q27 20 24.5 35.5', '#7A3B1E', 1.4);
    s += L('M9.4 10 Q20 12 30.6 10 M9.4 30 Q20 32 30.6 30', '#4A4450', 3);
    s += E(20, 4.2, 9.5, 2, '#C0703E', 2);
    s += C(20, 20, 1.6, '#3A1E0E');
    return s;
  },
  herd() {
    let s = '';
    s += R(4, 4, 32, 32, 3, '#ECE8F2', W);
    [[13, 13, 5.5], [27, 13, 4.5], [13, 25.5, 4.5], [27, 25.5, 5.5]].forEach(([x, y, r]) => {
      s += C(x, y, r, '#2A2530', 2) + C(x, y, r - 2.4, 'none', 1.4, RED);
    });
    s += R(4, 31, 32, 5, 1.5, '#C9C3D3', 2);
    s += C(11, 33.5, 1.3, INK) + C(17, 33.5, 1.3, INK) + C(23, 33.5, 1.3, INK) + C(29, 33.5, 1.3, INK);
    return s;
  },
  fluegel() {
    let s = '';
    // grand piano seen from above: keyboard at the bottom, curved tail at the top
    s += P('M5 33 L5 8 Q5 3 11 3 Q19 3 21 11 Q23 18 31 20 Q36 22 36 28 L36 33 Z', '#221E24', W);
    s += L('M8.5 29.5 L8.5 9 Q8.5 6 11.5 6 Q17 6 18.5 12.5 Q20.5 20.5 29.5 23', '#6A6270', 1.6);
    s += L('M10 10 L30 27', '#8A8290', 1.2);
    s += R(4, 31.5, 33, 6, 1, WHITE, 2.2);
    let k = '';
    for (let x = 8; x <= 33; x += 3) k += `M${x} 31.8 L${x} 35 `;
    s += L(k, INK, 1.6);
    return s;
  }
};

function object(key) {
  const f = Object.prototype.hasOwnProperty.call(OBJECTS, key) ? OBJECTS[key] : null;
  return svg('0 0 40 40', f ? f() : R(8, 8, 24, 24, 3, '#CCCCCC', 2.5));
}

/* ------------------------------------------------------------------ */
/* CLOUD, LOGO, CLOTHESPIN                                             */
/* ------------------------------------------------------------------ */
const CLOUDS = [
  { lobes: [[30, 40, 17], [50, 27, 20], [71, 36, 17], [82, 48, 12], [19, 50, 11], [48, 49, 16], [66, 52, 12], [50, 40, 16]],
    hi: [[42, 18, 6, 3.4, -25], [24, 34, 3.6, 2.2, -35], [66, 26, 3.4, 2, -20]] },
  { lobes: [[25, 42, 15], [42, 26, 17], [62, 24, 15], [78, 38, 16], [60, 48, 16], [36, 52, 13], [86, 52, 8], [52, 38, 16]],
    hi: [[35, 17, 5.4, 3, -30], [57, 15, 4, 2.4, -20], [19, 36, 3.2, 2, -40]] },
  { lobes: [[22, 46, 13], [36, 30, 16], [56, 22, 15], [74, 32, 16], [82, 50, 12], [58, 50, 16], [38, 52, 14], [54, 38, 16]],
    hi: [[29, 22, 5, 2.8, -35], [50, 13, 4.6, 2.6, -20], [70, 22, 3.2, 1.9, -15]] }
];
function cloudInner(variant) {
  const v = CLOUDS[((variant | 0) % CLOUDS.length + CLOUDS.length) % CLOUDS.length];
  let s = puffs(v.lobes, GAS, 3);
  // a soft darker belly for volume
  s += L('M24 58 Q40 66 58 63', '#5FC23A', 3);
  v.hi.forEach(([x, y, rx, ry, r]) => { s += E(x, y, rx, ry, GAS_HI, 0, 0, r); });
  return s;
}
function cloud(variant) {
  return svg('0 0 100 70', cloudInner(variant || 0));
}

function logoMascot() {
  let s = '';
  // big fart cloud behind/right of the dog
  const lobes = [[112, 88, 20], [132, 68, 23], [157, 60, 21], [177, 76, 15], [168, 98, 19], [145, 103, 21], [120, 111, 15], [183, 100, 9], [148, 82, 22]];
  s += puffs(lobes, GAS, 3.5);
  s += E(124, 56, 8, 4.4, GAS_HI, 0, 0, -30) + E(152, 46, 6, 3.4, GAS_HI, 0, 0, -15) + E(176, 66, 4, 2.4, GAS_HI, 0, 0, -10);
  s += E(104, 78, 3.6, 2.2, GAS_HI, 0, 0, -40) + C(160, 84, 2.2, GAS_HI);
  s += L('M136 118 Q152 126 170 116', '#5FC23A', 3.4);
  // little floating puffs
  s += puffs([[188, 40, 6], [196, 30, 3.6]], GAS, 2.6);
  // stink / motion lines
  s += stink('M150 30 Q146 25 150 20 Q154 15 150 10', 3);
  s += stink('M170 34 Q166 29 170 24 Q174 19 170 14', 3);
  s += L('M188 126 Q194 118 192 110', INK, 3);
  s += L('M176 138 Q186 134 190 126', INK, 3);
  // sparkles
  s += sparkle(128, 22, 7, CHEESE) + sparkle(194, 150, 5, PINK) + sparkle(104, 40, 4.5, SKY);
  // the innocent-looking dog
  s += `<g transform="translate(-6 28) scale(1.08)">${frenchieInner('', { mood: 'smug', bowtie: true })}</g>`;
  return svg('0 0 200 160', s);
}

function clothespin() {
  let s = '';
  s += `<g transform="rotate(38 20 20)">`;
  s += P('M11 4 Q11 2 13.5 2 L19.3 2.6 L19.5 37 Q19.3 38.5 17 38.5 L13.5 38.5 Q11.5 38.5 11.7 36.5 Z', '#E3B778', W);
  s += P('M29 4 Q29 2 26.5 2 L20.7 2.6 L20.5 37 Q20.7 38.5 23 38.5 L26.5 38.5 Q28.5 38.5 28.3 36.5 Z', '#D9A45F', W);
  s += L('M15 7 L15.3 13 M15.2 27 L15.4 34 M25 8 L24.8 14 M24.8 28 L24.6 33', '#B07A3C', 1.6);
  s += R(8, 16.5, 24, 7, 2.5, '#B9B2C2', W);
  s += L('M12.5 17.5 L12.5 22.5 M16.5 17.5 L16.5 22.5 M20 17.5 L20 22.5 M23.5 17.5 L23.5 22.5 M27.5 17.5 L27.5 22.5', '#6A6270', 1.6);
  s += `</g>`;
  return s && svg('0 0 40 40', s);
}

FD.art = {
  frenchie, snack, object, logoMascot, cloud, clothespin,
  DOG_IDS: ['pierre', 'pupsalot', 'bruno', 'mimi', 'gaston', 'baron', 'coco'],
  SNACK_KEYS: Object.keys(SNACKS),
  OBJECT_KEYS: Object.keys(OBJECTS)
};
})();
