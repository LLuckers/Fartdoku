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
/* Every dog = shared face rig (faceBase) driven by a LOOK (fur, head shape, ears,
 * eyes, pattern) + a big caricature accessory set (ACC). Unknown ids get LOOKS.plain. */
const EAR_L = 'M21 60 C8 44 5 27 10 13 Q15 3 27 8 C41 15 51 27 54 42 Z';
const EAR_L_IN = 'M25 50 C17 39 14 28 17 18 Q20 12 27 15 C36 20 43 29 46 40 Z';
const EAR_L_HI = 'M26 45 C21 37 19 29 20 21';
// right ear with a bite taken out (bruno)
const EAR_R_NOTCH = 'M99 60 C110 46 114 36 114 31 L106.5 27.5 L112.8 21.5 C112.3 17 111.5 15 110 13 Q105 3 93 8 C79 15 69 27 66 42 Z';
// right ear flopped over (gaston)
const EAR_R_FOLD = 'M66 44 C72 30 92 24 106 30 C115 34 118 46 114 56 Q110 62 105 56 C101 49 94 46 84 48 Z';
const EAR_R_FOLD_IN = 'M84 44 C92 38 102 38 108 44 C111 48 111 52 109 55 C104 48 96 45 84 46 Z';
const HEADS = {
  base:   'M60 33 C89 33 107 47 107 68 C107 92 90 104 60 104 C30 104 13 92 13 68 C13 47 31 33 60 33 Z',
  narrow: 'M60 31 C85 31 101 46 101 68 C101 93 86 105 60 105 C34 105 19 93 19 68 C19 46 35 31 60 31 Z',
  boxy:   'M60 35 C96 35 113 46 113 68 C113 96 97 106 60 106 C23 106 7 96 7 68 C7 46 24 35 60 35 Z',
  dainty: 'M60 36 C86 36 102 49 102 69 C102 91 87 102 60 102 C33 102 18 91 18 69 C18 49 34 36 60 36 Z',
  chubby: 'M60 34 C88 34 104 44 106 60 C116 70 114 94 96 101 C86 106 74 106 60 106 C46 106 34 106 24 101 C6 94 4 70 14 60 C16 44 32 34 60 34 Z',
  jowly:  'M60 34 C86 34 102 46 104 64 C114 76 114 98 96 104 C84 109 72 107 60 107 C48 107 36 109 24 104 C6 98 6 76 16 64 C18 46 34 34 60 34 Z'
};
const MUZ = 'M60 69 C75 69 85 77 85 88 C85 98 73 102 60 102 C47 102 35 98 35 88 C35 77 45 69 60 69 Z';
const NOSE = 'M50.5 75.5 Q60 70 69.5 75.5 Q71.5 81 64.5 84.5 Q60 86.5 55.5 84.5 Q48.5 81 50.5 75.5 Z';
const EYE_L = [41, 63], EYE_R = [79, 63];
const MIRROR = 'matrix(-1 0 0 1 120 0)';
const mirror = inner => `<g transform="${MIRROR}">${inner}</g>`;
const both = inner => inner + mirror(inner);
const side = (v, i) => Array.isArray(v) ? v[i] : v;

const LOOKS = {
  // classic black frenchie (logo mascot, unknown ids)
  plain: {},
  // fawn with a cream muzzle
  pierre: { fur: '#E39B55', muz: '#F7D5A3', wr: '#B8743A', sheen: '#F6BE80', brow: '#7A4520', lidHi: '#B8743A',
    cheek: '#FF6B5E', earS: 1.04 },
  // slate blue-grey, long narrow face
  pupsalot: { fur: '#8792A8', muz: '#B4BCCC', wr: '#636D86', sheen: '#A6B0C3', brow: '#353B4D', lidHi: '#5D667D',
    head: 'narrow', earS: 0.9, earRot: 5, eyeR: 11 },
  // dark brindle bruiser, boxy head, small mean eyes
  bruno: { fur: '#664430', muz: '#4E3222', wr: '#3E2617', sheen: '#87603F', brow: '#24160D', lidHi: '#4A2E1C',
    head: 'boxy', earS: 0.88, earR: 'notch', eyeR: 9.6, grumpy: true,
    pattern: () => L('M22 53 Q26 61 22 69 M14 66 Q18 74 14 82 M24 80 Q28 88 25 95 M98 53 Q94 61 98 69 M106 66 Q102 74 106 82 ' +
      'M96 80 Q92 88 95 95 M41 40 Q45 46 43 52 M79 40 Q75 46 77 52 M32 45 Q35 50 33 55 M88 45 Q85 50 87 55', '#2C1A0F', 3.4) },
  // pied: white with a black eye patch and black ears
  mimi: { fur: '#FBF7F2', muz: '#FFF1F4', wr: '#E6D7DE', sheen: '#FFFFFF', brow: ['#A49AA8', '#3A2E36'],
    lid: ['#221E24', '#FBF7F2'], lidHi: ['#6A6270', '#C9BCC4'], ear: '#221E24', head: 'dainty', eyeR: 13, lashes: true,
    mouth: '#E0245E', mouthW: 4.4, cheek: PINK, cheekOp: 0.4,
    pattern: () => P('M25 52 C29 42 45 40 54 47 C60 53 59 66 55 74 C49 80 35 80 28 74 C22 68 21 59 25 52 Z', '#221E24', 0) },
  // chocolate, chubby cheeks, one flopped ear
  gaston: { fur: '#B0612E', muz: '#F2C894', wr: '#84431C', sheen: '#CC8150', brow: '#4A240C', lidHi: '#84431C',
    head: 'chubby', earR: 'fold', eyeR: 10.5, cheek: '#FF5050', cheekOp: 0.6, cheekBig: true },
  // black, pompous pear-shaped jowls
  baron: { head: 'jowly', earS: 0.84, eyeR: 10.4, brow: '#C3BBC9',
    pattern: () => L('M21 79 Q16 91 25 100 M99 79 Q104 91 95 100', '#3C3640', 2.8) },
  // lilac it-girl with big ears
  coco: { fur: '#D9B3D5', muz: '#F2DCEE', wr: '#B58CB2', sheen: '#EBCFE8', brow: '#6E4A6C', lidHi: '#A57BA2',
    earS: 1.12, earRot: -6, nose: '#5A3050', cheek: PINK, cheekOp: 0.45 },
  // cream, under a brown hairdo
  leia: { fur: '#F2E2C4', muz: '#FFF7E8', wr: '#D5BE9B', sheen: '#FFF4DE', brow: '#6B3F24', lidHi: '#C9AE86' }
};
const LOOK_DEFAULT = {
  fur: '#221E24', muz: '#332D36', wr: '#3C3640', sheen: '#4A4450', brow: '#9A92A0', lidHi: '#6A6270', lid: null,
  ear: null, earS: 1, earRot: 0, earR: null, head: 'base', eyeR: 11.5, lashes: false, grumpy: false,
  mouth: '#0B080D', mouthW: 3, nose: '#0B080D', cheek: EAR_PINK, cheekOp: 0.35, cheekBig: false, pattern: null
};
function lookOf(dogId) {
  const own = Object.prototype.hasOwnProperty.call(LOOKS, dogId) ? LOOKS[dogId] : LOOKS.plain;
  return Object.assign({}, LOOK_DEFAULT, own);
}

function eye(cx, cy, mood, lk, i) {
  const k = lk.eyeR / 11.5;
  const o = cx < 60 ? -1 : 1;  // outer side
  const dx = mood === 'guilty' ? -3 * k : -0.6 * o;
  const dy = (mood === 'smug' ? 2.5 : mood === 'guilty' ? 0 : 1) * k;
  const ix = f1(cx + dx), iy = f1(cy + dy);
  const r13 = f1(13 * k), r12 = f1(12 * k), r10 = f1(10 * k);
  let s = C(cx, cy, f1(11.5 * k), WHITE, 3);
  s += C(ix, iy, f1(8 * k), '#5B3A28');
  s += C(ix, iy, f1(5.2 * k), '#0B080D');
  if (mood === 'smug') {
    // heavy half-closed lid, slightly slanted
    const t = -o;
    s += P(`M${cx - r13} ${cy + 1 - t} L${cx - r13} ${f1(cy - 14 * k)} L${cx + r13} ${f1(cy - 14 * k)} L${cx + r13} ${cy + 1 + t} Z`,
      side(lk.lid, i) || lk.fur, 0);
    s += L(`M${cx - r12} ${cy + 1 - t} Q${cx} ${cy - 1} ${cx + r12} ${cy + 1 + t}`, INK, 3.2);
    s += L(`M${cx - r10} ${f1(cy - 2 * k - t)} Q${cx} ${f1(cy - 4.5 * k)} ${cx + r10} ${f1(cy - 2 * k + t)}`, side(lk.lidHi, i), 2);
    s += C(f1(ix - 3 * k), f1(iy + 1.5 * k), f1(1.8 * k), WHITE);
    if (lk.lashes) {
      const y0 = cy + 1 + t * o;
      s += L(`M${cx + o * r12} ${y0} l${o * 5} -5 M${f1(cx + o * 7 * k)} ${f1(y0 - 1.2)} l${o * 3.5} -6 M${f1(cx + o * 2 * k)} ${f1(y0 - 2)} l${o * 1.5} -6.5`, INK, 2.6);
    }
  } else {
    s += C(f1(ix - 3 * k), f1(iy - 3.2 * k), f1(2.8 * k), WHITE);
    s += C(f1(ix + 2.8 * k), f1(iy + 2.6 * k), f1(1.3 * k), WHITE);
    if (lk.lashes) {
      const R0 = 11.5 * k;
      let d = '';
      for (const a of [195, 222, 249]) {
        const rad = (o < 0 ? a : 180 - a) * Math.PI / 180;
        const cs = Math.cos(rad), sn = Math.sin(rad);
        d += `M${f1(cx + R0 * cs)} ${f1(cy + R0 * sn)} L${f1(cx + (R0 + 6.5) * cs)} ${f1(cy + (R0 + 6.5) * sn)} `;
      }
      s += L(d, INK, 2.8);
    }
  }
  return s;
}

function ears(lk) {
  const fill = lk.ear || lk.fur;
  const tf = (px, rot) => `translate(${px} 50) rotate(${rot}) scale(${lk.earS}) translate(${-px} -50)`;
  const left = P(EAR_L, fill, 3) + P(EAR_L_IN, EAR_PINK, 0) + L(EAR_L_HI, '#FFB8D2', 2);
  let s = `<g transform="${tf(40, lk.earRot)}">${left}</g>`;
  if (lk.earR === 'notch') {
    s += `<g transform="${tf(80, -lk.earRot)}">${P(EAR_R_NOTCH, fill, 3)}${mirror(P(EAR_L_IN, EAR_PINK, 0))}</g>`;
  } else if (lk.earR === 'fold') {
    s += P(EAR_R_FOLD, fill, 3) + P(EAR_R_FOLD_IN, EAR_PINK, 0);
  } else {
    s += mirror(`<g transform="${tf(40, lk.earRot)}">${left}</g>`);
  }
  return s;
}

function faceBase(mood, opts, lk) {
  let s = ears(lk);
  // head
  s += P(HEADS[lk.head] || HEADS.base, lk.fur, 3);
  if (lk.pattern) s += lk.pattern();
  s += L('M24 52 Q31 42 43 38', lk.sheen, 3);              // sheen
  s += L('M48 44 Q60 39.5 72 44', lk.wr, 2.6);             // forehead wrinkles
  s += L('M51.5 50 Q60 46.5 68.5 50', lk.wr, 2.4);
  s += L('M60 53 L60 59', lk.wr, 2.2);
  // muzzle + jowl hint + cheeks
  s += P(MUZ, lk.muz, 0);
  s += L('M52 70.5 Q60 68 68 70.5', lk.wr, 2);
  const cr = lk.cheekBig ? [9, 5.5] : [6, 3.4];
  s += E(25, 80, cr[0], cr[1], lk.cheek).replace('/>', ` opacity="${lk.cheekOp}"/>`);
  s += E(95, 80, cr[0], cr[1], lk.cheek).replace('/>', ` opacity="${lk.cheekOp}"/>`);
  // eyes
  s += eye(EYE_L[0], EYE_L[1], mood, lk, 0) + eye(EYE_R[0], EYE_R[1], mood, lk, 1);
  // brows
  const bl = side(lk.brow, 0), br = side(lk.brow, 1);
  if (mood === 'guilty') {
    s += L('M29 49 Q38 47.5 47 42', bl, 3.4) + L('M91 49 Q82 47.5 73 42', br, 3.4);
  } else if (mood === 'smug') {
    s += L('M30 47 Q39 45.5 49 47', bl, 3.2) + L('M71 44 Q80 38.5 90 42.5', br, 3.2);
  } else if (lk.grumpy) {
    s += L('M28 47 Q39 47 51 54', bl, 4.4) + L('M92 47 Q81 47 69 54', br, 4.4);
  }
  // nose
  s += P(NOSE, lk.nose, 2.5);
  s += E(55.5, 75.8, 3, 1.5, '#9A92A0', 0, 0, -12);
  s += C(62.5, 75, 1, '#6A6270');
  // tongue (under the mouth lines)
  if (opts.tongue) {
    s += P('M53.5 89.5 Q52.5 101.5 60 101.5 Q67.5 101.5 66.5 89.5 Z', '#FF6FA5', 2.5);
    s += L('M60 92 L60 97.5', '#D94B80', 2);
  }
  // mouth
  const M = lk.mouth, mw = lk.mouthW;
  if (mood === 'guilty') {
    s += L('M60 85 L60 88', '#0B080D', 3);
    s += L('M46 92 Q50 88.5 54 91.5 Q58 94.5 62 91.5 Q66 88.5 70 91.5 Q72 93 74 92', M, mw);
  } else if (mood === 'smug') {
    s += L('M60 85 L60 88.5', '#0B080D', 3) + L('M60 88.5 Q55 92.5 49 90.5 M60 88.5 Q69 94 77 85.5', M, mw);
  } else {
    s += L('M60 85 L60 88.5', '#0B080D', 3) + L('M60 88.5 Q54 95 46.5 90.5 M60 88.5 Q66 95 73.5 90.5', M, mw);
  }
  return s;
}

function sweatDrop() {
  return P('M103 34 Q110 45 106.5 50 Q103 53.5 99.5 50 Q96 45 103 34 Z', SKY, 2.5) + E(101.5, 46, 1.3, 2.4, WHITE, 0, 0, 20);
}

// hanging curve under the chin, used by chains & necklaces
function chinCurve(t) {
  return [30 + 60 * t, 96 + 11 * Math.sin(Math.PI * t)];
}

const GOLD_DK = '#C99A00';
/* back(): drawn behind the head (collars, capes); front(): on top of the face. */
const ACC = {
  pierre: {
    back() {
      // marinière: white shirt with navy stripes
      let s = P('M22 99 Q60 114 98 99 L104 120 L16 120 Z', WHITE, 3);
      s += L('M21.5 106.5 Q60 121 98.5 106.5', '#2B4BA8', 3.6);
      s += L('M19.6 114 Q60 128 100.4 114', '#2B4BA8', 3.6);
      return s;
    },
    front() {
      let s = '';
      // baguette tucked under the arm
      s += `<g transform="rotate(-38 95 103)">`;
      s += R(70, 96, 50, 14, 7, '#E9A64C', 3);
      s += L('M79 99 L84 107 M89 99 L94 107 M99 99 L104 107 M109 99 L113 106', '#B9762E', 2.4);
      s += L('M75 99.5 Q90 97.5 112 99', '#F7CE8A', 2);
      s += `</g>`;
      // pencil moustache with curly tips
      s += both(L('M60 86 C55 89 47 89.5 40 86 C35 83.5 33 79 36 77 C38.5 75.8 40.5 78 39 80', INK, 3.6));
      // huge beret, slouched to the left
      s += `<g transform="rotate(-14 58 30)">`;
      s += P('M15 36 C6 24 22 7 56 6 C89 5 107 15 103 29 C100 38 84 42 60 42 C38 42 21 42 15 36 Z', RED, 3);
      s += L('M21 36.5 C42 44 82 43 99 32', '#C8323A', 3);
      s += L('M27 21 Q39 12 55 11', '#FF9A9A', 3);
      s += L('M58 6 Q57 2.5 60.5 1.5', INK, 3.6);
      s += `</g>`;
      return s;
    }
  },
  pupsalot: {
    back() {
      // stiff wing collar
      return P('M38 99 L54 104 L46 114 Z', WHITE, 2.6) + P('M82 99 L66 104 L74 114 Z', WHITE, 2.6);
    },
    front() {
      let s = '';
      // black bow tie
      s += P('M60 106 L46 99.5 Q43 106 46 112.5 Z', '#1E1B22', 3) + P('M60 106 L74 99.5 Q77 106 74 112.5 Z', '#1E1B22', 3);
      s += E(60, 106, 4, 4.6, '#3A3542', 2.6);
      // white handlebar moustache
      s += both(P('M60 86 C55 83 46 83.5 39 87 C32 90.5 25 89 23 84 C21.5 80 24.5 76.5 28 78 C26 81 28 84.5 32 83.5 ' +
        'C39 81.5 47 79.5 53 80.5 C57 81 59 83 60 84 Z', WHITE, 2.6));
      // monocle on the right eye + chain
      s += L('M92 72 Q98 85 95 95 Q93 102 99 109', INK, 4.4);
      s += `<path d="M92 72 Q98 85 95 95 Q93 102 99 109" fill="none" stroke="${CHEESE}" stroke-width="2.2" stroke-dasharray="2.6 2.2" stroke-linecap="round"/>`;
      s += C(EYE_R[0], EYE_R[1], 15, 'none', 7, INK);
      s += C(EYE_R[0], EYE_R[1], 15, 'none', 3.6, '#FFB627');
      s += L('M69.5 53 Q74.5 50 80 50', '#FFF2B0', 1.8);
      // towering top hat
      s += `<g transform="rotate(-8 60 36)">`;
      s += P('M40 37 L37 5 Q60 0 83 5 L80 37 Z', '#1E1B22', 3);
      s += P('M39.3 28 L80.7 28 L80 37 L40 37 Z', '#FFB627', 2.6);
      s += P('M20 39 Q60 30 100 39 Q60 47.5 20 39 Z', '#1E1B22', 3);
      s += L('M44 8.5 L46.5 24', '#5A5468', 3);
      s += `</g>`;
      return s;
    }
  },
  bruno: {
    front() {
      let s = '';
      // underbite: jutting lower jaw with two fangs
      s += P('M42 90 Q60 105 78 90 Q60 98 42 90 Z', '#4E3222', 2.8);
      s += P('M47.5 93.2 L50 83.5 L54 94.6 Z', WHITE, 2.2) + P('M66 94.6 L70 83.5 L72.5 93.2 Z', WHITE, 2.2);
      // tough-guy scar over the left eye
      s += L('M27 42 L42 61', '#F0A8BC', 3);
      s += L('M29.5 49 L35 46.5 M33 54 L38.5 51.5', '#F0A8BC', 2);
      // massive gold chain + dollar medallion
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const [x, y] = chinCurve(t);
        const a = Math.cos(Math.PI * t) * -20 + (i % 2 ? 90 : 0);
        s += E(f1(x), f1(y + 1), 5.6, 4, CHEESE, 2.6, INK, f1(a));
        s += E(f1(x), f1(y + 1), 2.4, 1.1, GOLD_DK, 0, 0, f1(a));
      }
      s += C(60, 111.5, 8.5, CHEESE, 3);
      s += L('M63.5 107.5 Q60 105.5 57 107.5 Q55.5 110 60 111.5 Q64.5 113 63 115.5 Q60 117.5 56.5 115.5 M60 104.5 L60 118.5', GOLD_DK, 2.2);
      // backwards-ish snapback, visor sideways to the left
      s += `<g transform="rotate(-10 60 30)">`;
      s += P('M33 44 Q14 37 3 43 Q6 52 33 50 Z', '#17988C', 3);
      s += P('M26 45 C24 24 40 13 60 13 C80 13 96 24 94 45 Q60 37 26 45 Z', TEAL, 3);
      s += L('M60 14 L60 39 M45 18 Q40 29 41.5 41.5 M75 18 Q80 29 78.5 41.5', '#17988C', 2.2);
      s += L('M33 27 Q40 19 50 16.5', '#8BE8DF', 2.6);
      s += C(60, 13, 3.2, TEAL, 2.4);
      s += `</g>`;
      return s;
    }
  },
  mimi: {
    front() {
      let s = '';
      // pearls
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const [x, y] = chinCurve(i / n);
        s += C(f1(x), f1(y + 2), 4, WHITE, 2);
        s += C(f1(x - 1.2), f1(y + 0.8), 1.2, '#E6E0F0');
      }
      // beauty mark
      s += C(87, 82, 1.9, INK);
      // enormous polka-dot bow on top of the head
      s += `<g transform="rotate(-8 60 22)">`;
      s += P('M58 26 L47 44 L53 43 L55.5 48 L62 29 Z', '#E0306F', 2.6) + P('M62 26 L73 44 L67 43 L64.5 48 L58 29 Z', '#E0306F', 2.6);
      s += both(P('M60 23 C51 6 27 0 21 13 C16 25 23 38 36 37 C46 36 55 31 60 23 Z', PINK, 3));
      s += both(C(30, 15, 2.8, '#FFB3D1') + C(40, 27, 2.6, '#FFB3D1') + C(27, 28, 2.2, '#FFB3D1') + C(44, 14, 2, '#FFB3D1'));
      s += both(L('M52 19 Q44 15 36 19', '#E0306F', 2.2));
      s += E(60, 24, 7, 8.4, '#E0306F', 3);
      s += L('M57.5 20 Q59 18.5 61 19', '#FF8FB8', 2);
      s += `</g>`;
      return s;
    }
  },
  gaston: {
    front() {
      let s = '';
      // orange neckerchief
      s += P('M40 101 Q60 109 80 101 L60 118 Z', ORANGE, 3);
      s += C(60, 105, 4.2, ORANGE, 2.6);
      s += L('M49 107.5 Q60 111.5 71 107.5', '#FFA66E', 2.2);
      // chunky curled moustache
      s += both(P('M60 86 C56 82 49 81 43 83 C37 85 32.5 82 33.5 77.5 C34.5 73.5 40 73 40.5 77 C40.6 79 38.5 79.5 38 78 ' +
        'C42 78 48 77.5 53 79 C57 80 59.5 82.5 60 84 Z', '#2A1810', 2.4));
      // wooden spoon
      s += `<g transform="rotate(32 100 98)">`;
      s += R(97, 92, 6, 34, 3, '#D9A060', 2.6);
      s += E(100, 82, 8, 11, '#D9A060', 3);
      s += E(100, 82.5, 4.6, 7, '#B57A3C', 0);
      s += `</g>`;
      // towering chef's toque
      s += P('M38 43 L40 24 L80 24 L82 43 Q60 47 38 43 Z', WHITE, 3);
      s += L('M50 28 L49.5 41.5 M60 28 L60 43.5 M70 28 L70.5 41.5', '#CFC8D8', 2);
      s += puffs([[40, 21, 9.5], [51, 13.5, 10.5], [69, 13.5, 10.5], [80, 21, 9.5], [60, 20, 10.5]], WHITE, 3);
      s += L('M44 13 Q47 7 53 6', '#E4DEEC', 2.4);
      return s;
    }
  },
  baron: {
    back() {
      // royal purple cape
      return P('M6 98 Q60 124 114 98 L118 120 L2 120 Z', PURPLE, 3);
    },
    front() {
      let s = '';
      // ermine collar under the jowls
      s += P('M16 99 Q60 117 104 99 L108 108 Q60 130 12 108 Z', WHITE, 3);
      for (const x of [22, 37, 52, 68, 83, 98]) {
        const y = 106 + 11 * Math.sin(Math.PI * (x - 12) / 96);
        s += P(`M${x} ${f1(y - 2.5)} q2 3 0 6 q-2 -3 0 -6 Z`, INK, 0);
      }
      // order star on the cape
      s += P('M98 108 L100 112.5 L105 113 L101 116 L102.5 120 L98 117.6 L93.5 120 L95 116 L91 113 L96 112.5 Z', CHEESE, 2.2);
      // oversized jewelled crown on purple velvet
      s += `<g transform="rotate(-6 60 30)">`;
      s += E(60, 27, 25, 14, '#5B3FD9', 3);
      s += P('M32 42 L27 12 L44 26 L60 8 L76 26 L93 12 L88 42 Q60 48 32 42 Z', CHEESE, 3);
      s += L('M31 35 Q60 40 89 35', GOLD_DK, 2.6);
      s += C(27, 10.5, 3.8, CHEESE, 2.4) + C(60, 6.5, 4.2, CHEESE, 2.4) + C(93, 10.5, 3.8, CHEESE, 2.4);
      s += E(44, 38, 3.6, 3.2, RED, 2.2) + E(60, 39.5, 4.8, 4.2, TEAL, 2.4) + E(76, 38, 3.6, 3.2, RED, 2.2);
      s += C(58.6, 38.2, 1.3, WHITE);
      s += E(60, 25, 3, 4, PINK, 2);
      s += L('M35 30 L32.5 18', '#FFF2B0', 2.6);
      s += `</g>`;
      return s;
    }
  },
  coco: {
    front() {
      let s = '';
      // gold hoop earrings
      s += both(C(11, 73, 7.5, 'none', 6, INK) + C(11, 73, 7.5, 'none', 3, CHEESE) + C(14.5, 63, 2.4, CHEESE, 2));
      // giant heart sunglasses (tinted, the eyes still peek through)
      s += L('M25 58 L11 52', INK, 4.2) + L('M95 58 L109 52', INK, 4.2);
      s += L('M51 58 Q60 52 69 58', INK, 4.4);
      for (const cx of [40, 80]) {
        s += `<path d="${heartPath(cx, 63, 18)}" fill="${SKY}" fill-opacity="0.55" ${S(4)}/>`;
        s += L(`M${cx - 13} ${57} Q${cx - 11} ${50} ${cx - 4} ${49}`, WHITE, 3) + C(cx - 7, 62, 1.7, WHITE);
      }
      // selfie phone
      s += `<g transform="rotate(-16 20 104)">`;
      s += R(8, 86, 23, 34, 5, '#1E8FC4', 3);
      s += R(11.5, 91, 16, 22, 2.5, '#DFF4FF', 0);
      s += P(heartPath(19.5, 101.5, 4.2), PINK, 1.8);
      s += `</g>`;
      return s;
    }
  },
  leia: {
    back() {
      // white rebel robe
      let s = P('M27 99 Q60 112 93 99 L100 120 L20 120 Z', WHITE, 3);
      s += L('M43 106 L39 120 M77 106 L81 120', '#D8D2E0', 2.2);
      return s;
    },
    front() {
      let s = '';
      const HAIR = '#6B3F24';
      // hair parted in the middle, down to the buns
      s += P('M60 33 C88 33 106 46 107 64 L97 64 C94 52 80 44.5 60 44.5 C40 44.5 26 52 23 64 L13 64 C14 46 32 33 60 33 Z', HAIR, 3);
      s += L('M60 34.5 L60 44', '#4A2A16', 2.4);
      s += both(L('M50 37 Q36 41 28 54', '#8E5833', 2.2));
      // side-bun cinnamon rolls
      for (const [cx, dir] of [[15, 1], [105, -1]]) {
        s += C(cx, 67, 13, HAIR, 3);
        s += L(`M${cx} 67 m${-3 * dir} 0 a3 3 0 1 ${dir > 0 ? 1 : 0} ${6 * dir} 0 a6.5 6.5 0 1 ${dir > 0 ? 1 : 0} ${-12 * dir} 1 a9.5 9.5 0 1 ${dir > 0 ? 1 : 0} ${17 * dir} -3`, '#A26A40', 2.2);
      }
      // collar of the robe + silver belt buckle peeking out
      s += P('M51 105 Q60 108 69 105 L60 114 Z', '#E9E4F0', 2.2);
      return s;
    }
  }
};

function frenchieInner(dogId, opts) {
  opts = opts || {};
  const mood = opts.mood === 'guilty' || opts.mood === 'smug' ? opts.mood : 'normal';
  const lk = lookOf(dogId);
  const acc = Object.prototype.hasOwnProperty.call(ACC, dogId) ? ACC[dogId] : null;
  let s = acc && acc.back ? acc.back(mood, lk) : '';
  s += faceBase(mood, opts, lk);
  if (opts.bowtie) {
    s += P('M60 104 L45 96 Q42 104 45 112 Z', PINK, 3);
    s += P('M60 104 L75 96 Q78 104 75 112 Z', PINK, 3);
    s += L('M48 100 L48 108 M72 100 L72 108', '#FF8FB8', 2);
    s += E(60, 104, 4.4, 5, '#E0306F', 2.6);
  }
  if (acc && acc.front) s += acc.front(mood, lk);
  if (mood === 'guilty') s += sweatDrop();
  return s;
}

function frenchie(dogId, opts) {
  return svg('0 0 120 120', frenchieInner(dogId, opts || {}));
}

/* ------------------------------------------------------------------ */
/* SNACKS & OBJECTS live in js/art-props.js (registered as FD.artProps) */
/* ------------------------------------------------------------------ */
const props = () => FD.artProps || { SNACKS: {}, OBJECTS: {} };
function snack(key) {
  const T = props().SNACKS;
  const f = Object.prototype.hasOwnProperty.call(T, key) ? T[key] : null;
  return svg('0 0 40 40', f ? f() : C(20, 20, 12, '#CCCCCC', 2.5));
}
function object(key) {
  const T = props().OBJECTS;
  const f = Object.prototype.hasOwnProperty.call(T, key) ? T[key] : null;
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

const W = 2.5; // stroke width for 40-box icons
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
  DOG_IDS: ['pierre', 'pupsalot', 'bruno', 'mimi', 'gaston', 'baron', 'coco', 'leia'],
  get SNACK_KEYS() { return Object.keys(props().SNACKS); },
  get OBJECT_KEYS() { return Object.keys(props().OBJECTS); },
  // shared drawing helpers for js/art-props.js
  _h: { INK, PINK, CHEESE, GAS, GAS_HI, SKY, ORANGE, RED, TEAL, PURPLE, WHITE, svg, S, P, L, C, E, R, f1, puffs, heartPath, sparkle, stink }
};
})();
