// PianoClear's shared parts: note maths, a string scale for a 2.1 m grand, a small
// WebAudio piano synth, computer-keyboard input, keys, and a 3D grand piano.
// The piano is built in metres (x across the keyboard, bass on the left; y up from
// the floor; z towards the player) and scaled up by the chapters that use it.
import { THREE, M, box, beam, clamp } from './kit.js';
import { audio } from './ui.js';

const TAU = Math.PI * 2;
export const G = 9.80665;                 // m/s², to turn kilograms-force into newtons
export const RHO_STEEL = 7850;            // music wire, kg/m³
export const RHO_CU = 8960;               // copper winding, kg/m³
export const E_STEEL = 2.0e11;            // Young's modulus of music wire, Pa
export const UTS = 2.2e9;                 // breaking stress of ~1 mm music wire, Pa (ASTM A228 is 2.1–2.4 GPa at this size)

// ---------------------------------------------------------------- notes
// Keys are numbered 1 (A0) to 88 (C8). Equal temperament: each semitone is ×2^(1/12), A4 (key 49) = 440 Hz.
export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const freqOf = (n) => 440 * 2 ** ((n - 49) / 12);
export const pcOf = (n) => (n + 8) % 12;                  // pitch class, C = 0; key 1 is A
export const octaveOf = (n) => Math.floor((n + 8) / 12);  // key 4 is C1, key 40 is C4 (middle C)
export const nameOf = (n) => NOTE_NAMES[pcOf(n)] + octaveOf(n);
export const isBlack = (n) => [1, 3, 6, 8, 10].includes(pcOf(n));
export const SEMI = 2 ** (1 / 12);
// Nearest key to a frequency, and how far off it is in cents (hundredths of a semitone).
export function nearest(f) {
  const x = 49 + 12 * Math.log2(f / 440), n = Math.round(x);
  return { n, cents: (x - n) * 100, name: n >= 1 && n <= 88 ? nameOf(n) : n < 1 ? 'below A0' : 'above C8' };
}
// Railsback stretch: how far a typical aural tuning sits from pure equal temperament, in cents.
// Roughly −30 cents at A0 and +30 cents at C8, near zero in the middle (Railsback 1938; Fletcher & Rossing).
export const stretchCents = (n) => (n >= 49 ? 30 * ((n - 49) / 39) ** 2.4 : -25 * ((49 - n) / 48) ** 2.4);

// ---------------------------------------------------------------- the string scale
// A made-up but realistic scale for a 2.1 m grand. Speaking lengths: 52 mm at C8, growing
// ×1.9 per octave down to middle C (an ideal scale would double, but that makes the bass far
// too long), then more slowly; the bass strings sit on their own bridge.
// Plain strings are steel wire sized to pull about 76–84 kgf; where a plain wire would need to be
// thicker than 1.25 mm, the string is wound with copper instead (it adds mass, not stiffness).
// Unisons: keys 1–10 have one string, 11–28 two, 29–88 three: 226 strings.
export const DAMPED_TO = 69;              // dampers stop at F6; the top 19 notes ring on their own
export const BASS_BRIDGE_TO = 20;         // keys 1–20 cross over the others on the bass bridge
export const speakingLength = (n) => (n >= 40 ? 0.052 * 1.9 ** ((88 - n) / 12) : n > BASS_BRIDGE_TO ? 0.052 * 1.9 ** 4 * 1.45 ** ((40 - n) / 12) : 1.25 + ((BASS_BRIDGE_TO - n) / 19) * 0.32);
export const unison = (n) => (n <= 10 ? 1 : n <= 28 ? 2 : 3);
export const muSteel = (d) => RHO_STEEL * Math.PI * d * d / 4;
// A copper wire of diameter dw wound tightly round a core dc adds ρ·π²·dw·(dc+dw)/4 kg per metre.
export const muWound = (dc, dw) => muSteel(dc) + RHO_CU * Math.PI ** 2 * dw * (dc + dw) / 4;
export const tensionOf = (L, f, mu) => (2 * L * f) ** 2 * mu;          // Mersenne–Taylor: f = √(T/μ) / 2L
export const freqFrom = (L, T, mu) => Math.sqrt(T / mu) / (2 * L);
// Inharmonicity coefficient of a stiff string (Fletcher 1964): B = π³·E·d⁴ / (64·T·L²), using the core only.
export const inharm = (d, T, L) => (Math.PI ** 3 * E_STEEL * d ** 4) / (64 * T * L * L);

export const SCALE = [];
for (let n = 1; n <= 88; n++) {
  const L = speakingLength(n), f = freqOf(n), s = (2 * L * f) ** 2;
  const target = (n > 40 ? 82 - (6 * (n - 40)) / 48 : 82) * G;
  let d = Math.sqrt(target / s / (RHO_STEEL * Math.PI / 4)), kind = 'plain', D, mu, T;
  if (d > 1.25e-3 || n <= BASS_BRIDGE_TO) {
    kind = 'wound';
    T = (80 + (n <= 26 ? ((26 - n) / 25) * 40 : 0)) * G;      // bass strings pull harder: up to 120 kgf
    mu = T / s;
    d = (1.1 + (Math.max(0, 34 - n) / 33) * 0.5) * 1e-3;     // core 1.1–1.6 mm
    const m = (mu - muSteel(d)) * 4 / (RHO_CU * Math.PI ** 2);
    const dw = (-d + Math.sqrt(d * d + 4 * m)) / 2;
    D = d + 2 * dw;
  } else {
    d = clamp(d, 0.78e-3, 1.25e-3); mu = muSteel(d); T = s * mu; D = d;
  }
  SCALE[n] = { n, L, f, d, D, mu, T, kind, strings: unison(n), B: inharm(d, T, L) };
}
export const TOTAL_STRINGS = SCALE.reduce((a, s) => a + (s ? s.strings : 0), 0);
export const TOTAL_TENSION = SCALE.reduce((a, s) => a + (s ? s.strings * s.T : 0), 0);   // newtons

// Hammer and sound. Hammer speeds run from about 0.5 m/s (pp) to 6 m/s (ff) (Askenfelt & Jansson,
// "From touch to string vibrations", 1990). Felt gets stiffer the harder it is squashed, so a faster
// hammer touches the string for a shorter time, which adds high overtones: contact time ∝ v^−0.43
// (a felt stiffness exponent of about 2.5; Hall 1987). Base times: about 4 ms in the bass, under 1 ms at the top.
export const contactTime = (n, v) => 0.004 * 2 ** (-(n - 1) / 40) * (Math.max(0.2, v) / 0.5) ** -0.43;
// Sound level at about 1 m, rising 6 dB for each doubling of hammer speed. Calibrated so a mezzo-forte
// middle note (about 2 m/s) gives about 85 dB, which is typical of a grand close up.
export const levelDb = (v) => 79 + 20 * Math.log10(Math.max(0.1, v));
export const dynamicName = (v) => (v < 0.8 ? 'pp' : v < 1.4 ? 'p' : v < 2.2 ? 'mp' : v < 3.2 ? 'mf' : v < 4.6 ? 'f' : 'ff');

// ---------------------------------------------------------------- synth
// Additive piano: each note is a sum of sine partials fₙ = n·f₀·√(1 + B·n²), with the
// string's own inharmonicity B. Partial amplitudes follow the strike point (a hammer at 1/8 of
// the length can't excite the 8th partial) and the felt's contact time (harder = brighter).
// Each partial decays on its own, higher ones faster. A damper stops it in about a tenth of a second.
// Sound only starts after a real click or key press, never while the studio is recording.
let ctx = null, master = null, dry = null, wet = null, noise = null, gestured = false;
const voices = [];
if (typeof window !== 'undefined') {
  const mark = () => { gestured = true; };
  ['pointerdown', 'keydown', 'touchstart'].forEach((t) => window.addEventListener(t, mark, { capture: true, passive: true }));
}
const recording = () => document.body.classList.contains('gb-reel') || /[?&]reel=1/.test(location.search);

function ready() {
  if (audio.muted || recording()) return null;
  if (!gestured && !navigator.userActivation?.hasBeenActive) return null;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!master) {
      master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
      master.connect(comp).connect(ctx.destination);
      dry = ctx.createGain(); dry.connect(master);
      // A small room: a convolver with a decaying noise tail. It also stands in for the halo of
      // sympathetic strings when the sustain pedal is down.
      const conv = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      let seed = 7;
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = ((seed / 2147483647) * 2 - 1) * Math.exp((-4 * i) / len); } }
      conv.buffer = ir;
      wet = ctx.createGain(); wet.gain.value = 0.12; wet.connect(conv).connect(master);
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
      const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) { seed = (seed * 16807) % 2147483647; nd[i] = (seed / 2147483647) * 2 - 1; }
    }
    return ctx;
  } catch { return null; }
}

function release(v, t, tau) {
  if (v.off) return;
  v.off = true;
  for (const g of v.gains) {
    try {
      if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(t); else { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); }
      g.gain.setTargetAtTime(0, t, tau);
    } catch { /* ignore */ }
  }
  v.oscs.forEach((o) => { try { o.stop(t + tau * 8); } catch { /* already stopped */ } });
}

export const synth = {
  sustain: false,
  get context() { return ctx; },
  get voices() { return voices.length; },
  // Keep the master in step with the mute button (notes that are already ringing fall silent too).
  sync() { if (master && ctx) { const want = audio.muted || recording() ? 0 : 0.9; if (Math.abs(master.gain.value - want) > 0.01) master.gain.setTargetAtTime(want, ctx.currentTime, 0.02); } },
  // Strike key n with a hammer moving at v m/s. Options: board (0 = no soundboard), strings struck,
  // stretch (cents), wetness. Returns the voice, or null when sound can't play.
  strike(n, v = 2, { board = 1, strings, cents = 0, wetness = 0.12, freq, B: Bx, soft = 0 } = {}) {
    try {
      const ac = ready(); if (!ac) return null;
      const s = SCALE[clamp(Math.round(n), 1, 88)], t = ac.currentTime + 0.005;
      const f0 = (freq || s.f) * 2 ** (cents / 1200), B = Math.min(Bx ?? s.B, 0.02), tc = contactTime(n, v) * (1 + soft);   // soft: una corda uses a less-packed spot of felt
      const nStr = strings ?? s.strings;
      const amp = 0.09 * (v / 2) ** 0.9 * (board ? 1 : 0.035) * (0.6 + 0.4 * Math.sqrt(nStr / 3));
      // Time constant of the fundamental: about 3 s in the bass, ~1.4 s at A4, a quarter-second at the top.
      // Without a soundboard the string loses energy far more slowly (it can hardly give it to the air).
      const tau = clamp(3.2 * 2 ** (-(n - 20) / 24), 0.22, 3.6) * (board ? 1 : 4);
      const bus = ac.createGain(); bus.gain.value = 1; bus.connect(dry);
      const send = ac.createGain(); send.gain.value = wetness; bus.connect(send).connect(wet);
      const vo = { n, oscs: [], gains: [], off: false, t0: t };
      const maxN = Math.max(1, Math.min(18, Math.floor(9000 / f0)));
      let norm = 0;
      const parts = [];
      for (let k = 1; k <= maxN; k++) {
        const fk = k * f0 * Math.sqrt(1 + B * k * k);
        if (fk > 12000) break;
        const comb = Math.abs(Math.sin((k * Math.PI) / 8.3));             // strike point ≈ 1/8.3 of the length
        const felt = 1 / (1 + (fk * tc * 1.4) ** 3);                     // soft, slow contact filters the highs
        const a = (comb / k ** 0.55) * felt;
        norm += a; parts.push([k, fk, a]);
      }
      const scale = amp / Math.max(0.6, norm ** 0.5);
      for (const [k, fk, a] of parts) {
        const tk = tau / (1 + 0.22 * (k - 1)) / (1 + fk / 6000);
        const detunes = k <= 3 && nStr > 1 ? [-0.6, 0.6].slice(0, nStr > 2 ? 2 : 1) : [0];   // unisons a hair apart beat slowly
        for (const dc of detunes) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.frequency.value = fk * 2 ** (dc / 1200);
          const peak = (a * scale) / detunes.length;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(peak, t + 0.002 + tc);
          g.gain.setTargetAtTime(peak * 0.0001, t + 0.002 + tc, tk);
          o.connect(g).connect(bus); o.start(t); o.stop(t + 0.01 + tc + tk * 9);
          vo.oscs.push(o); vo.gains.push(g);
        }
      }
      // The thump of felt on wire and the key hitting its bed.
      const src = ac.createBufferSource(); src.buffer = noise;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180 + 180 * v;
      const ng = ac.createGain(); ng.gain.setValueAtTime(0.02 * (v / 2) * (board ? 1 : 0.2), t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(lp).connect(ng).connect(bus); src.start(t);
      voices.push(vo);
      while (voices.length > 24) { const old = voices.shift(); release(old, ac.currentTime, 0.03); }
      return vo;
    } catch { return null; }
  },
  // A damper lands on the strings of key n (ignored above F6, which has no dampers).
  damp(n, tau = 0.08) {
    if (!ctx || n > DAMPED_TO) return;
    for (const v of voices) if (v.n === n && !v.off) release(v, ctx.currentTime, tau * (n < 30 ? 1.8 : 1));
  },
  allOff() { if (ctx) voices.forEach((v) => release(v, ctx.currentTime, 0.05)); voices.length = 0; },
};

// ---------------------------------------------------------------- computer keyboard
// A row of letters plays like a piano: A S D F G H J K L are white keys, W E T Y U O P black ones.
// Z and X shift down or up an octave. Returns a function that removes the listeners.
const KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16 };
export function keyInput({ onDown, onUp, onOctave }) {
  const held = new Map();
  const busy = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.getElementById('modal')?.hidden === false;
  const kd = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || busy()) return;
    const k = e.key.toLowerCase();
    if ((k === 'z' || k === 'x') && !e.repeat) { onOctave?.(k === 'z' ? -1 : 1); return; }
    if (!(k in KEYMAP) || e.repeat) return;
    const n = onDown(KEYMAP[k]);
    if (n) held.set(k, n);
    e.preventDefault();
  };
  const ku = (e) => { const k = e.key.toLowerCase(); if (held.has(k)) { onUp?.(held.get(k)); held.delete(k); } };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); held.forEach((n) => onUp?.(n)); };
}

// ---------------------------------------------------------------- keys
// Real key sizes: white keys 23.5 mm apart (52 of them make 1.22 m), 150 mm of white showing;
// black keys 11 mm wide, 95 mm long, standing 12 mm higher.
export const KEY = { W: 0.0235, WL: 0.15, BW: 0.0115, BL: 0.095, H: 0.022, BH: 0.012, LEN: 0.5, PIVOT: 0.235, DIP: 0.010 };
export const WHITE_COUNT = 52;
// x of each key's centre (metres, 0 = middle of the keyboard).
export const keyX = [];
{
  let wi = 0;
  for (let n = 1; n <= 88; n++) {
    if (isBlack(n)) keyX[n] = (wi - 26) * KEY.W;             // on the line between two white keys
    else { keyX[n] = (wi - 25.5) * KEY.W; wi++; }
  }
}

// Build keys a..b. Each key turns about its balance point (KEY.PIVOT behind its front edge).
// The front edge is at z = 0, the top of the white keys at y = 0. key.set(k) presses it (0→1 of a 10 mm dip).
export function makeKeys(a = 1, b = 88, { x0 = 0 } = {}) {
  const group = new THREE.Group(), keys = [];
  const ivory = M.plastic(0xf4f1ea, { roughness: 0.3 }), ebony = M.plastic(0x15161b, { roughness: 0.3 }), wood = M.matte(0xcaa472);
  for (let n = a; n <= b; n++) {
    const black = isBlack(n);
    const pivot = new THREE.Group(); pivot.position.set(keyX[n] - x0, -KEY.H, -KEY.PIVOT); group.add(pivot);
    const k = new THREE.Group(); k.position.set(0, KEY.H, KEY.PIVOT); pivot.add(k);
    const stick = box(black ? KEY.BW * 0.9 : KEY.W - 0.0012, KEY.H, KEY.LEN - (black ? 0.06 : KEY.WL), wood);
    stick.position.set(0, -KEY.H / 2, -(black ? 0.06 : KEY.WL) - (KEY.LEN - (black ? 0.06 : KEY.WL)) / 2); k.add(stick);
    let top;
    if (black) { top = box(KEY.BW, KEY.BH + 0.008, KEY.BL, ebony); top.position.set(0, KEY.BH / 2 - 0.004 + 0.002, -KEY.BL / 2 - 0.001); }
    else { top = box(KEY.W - 0.0012, KEY.H, KEY.WL, ivory); top.position.set(0, -KEY.H / 2, -KEY.WL / 2); }
    top.userData.key = n; stick.userData.key = n; k.add(top);
    const key = { n, black, pivot, mesh: top, stick, dip: 0, set(v) { this.dip = v; pivot.rotation.x = Math.asin((clamp(v, 0, 1.2) * KEY.DIP) / KEY.PIVOT); } };
    keys[n] = key;
  }
  return { group, keys, pickables: keys.filter(Boolean).flatMap((k) => [k.mesh, k.stick]) };
}

// ---------------------------------------------------------------- grand piano
// A 2.1 m grand. Heights (m): rim 0.56–0.99, key tops 0.72, soundboard 0.80, treble strings 0.84,
// bass strings 0.865 (crossing over the tenor), iron plate 0.85–0.88.
export const GR = {
  W: 0.74, KEY_Z: 0.2, KEY_Y: 0.72, BOARD_Y: 0.80, STR_Y: 0.84, BASS_Y: 0.865, HAM_Z: -0.28, BELLY_Z: -0.315, DAMP_Z: -0.305,
  PIN_Z: -0.045, FLANGE_Z: -0.155, FLANGE_Y: 0.745, BLOW: 0.045,
};
// Outline of the case seen from above, as (x, z): straight spine on the left, S-shaped bentside on the right.
const OUTLINE = [[-0.74, 0.2], [-0.74, -1.0], [-0.74, -1.62], [-0.69, -1.79], [-0.55, -1.9], [-0.33, -1.93], [-0.14, -1.87], [0.0, -1.72], [0.12, -1.48], [0.28, -1.17], [0.5, -0.83], [0.67, -0.52], [0.74, -0.24], [0.74, 0.2]];
function smoothOutline(pts, per = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  return curve.getPoints(pts.length * per).map((p) => [p.x, p.z]);
}
export const CASE_OUT = smoothOutline(OUTLINE);
// Offset a polyline inwards (to the right of travel for this clockwise-from-above path) by t.
function offset(pts, t) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [p[0] - (dz / l) * t, p[1] + (dx / l) * t];            // normal (−dz, dx) points inwards
  });
}
export const CASE_IN = offset(CASE_OUT, 0.06);
// Is (x, z) inside the case (inside the inner outline, closed across the front)?
export function insideCase(x, z, pts = CASE_IN) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
// A flat horizontal slab from an outline in (x, z), from y0 up to y0 + h.
export function slab(pts, y0, h, mat) {
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
  return m;
}
// The soundboard's outline: the inside of the case behind the belly rail.
export function boardOutline() {
  const pts = CASE_IN.filter(([, z]) => z < GR.BELLY_Z);
  return [[CASE_IN[0][0], GR.BELLY_Z], ...pts, [CASE_IN.at(-1)[0], GR.BELLY_Z]];
}

// Where each string lies (metres). Strings run from the tuning pins (front) past the strike point,
// over a bridge on the soundboard, to hitch pins. Bass strings angle right, tenor strings angle left,
// so they cross. Returns [{ n, i, a: [x, y, z] front of speaking length, b: bridge end, pin: [x, y, z] }].
export function stringLayout() {
  const out = [];
  for (let n = 1; n <= 88; n++) {
    const s = SCALE[n], bass = n <= BASS_BRIDGE_TO;
    const ang = bass ? -0.14 : 0.19 * clamp((40 - n) / 19, 0, 1);    // radians; + leans left going back
    const beta = n <= 40 ? 1 / 8 : 1 / 8 + ((n - 40) / 48) * (1 / 14 - 1 / 8);   // strike point: 1/8 in the bass, ~1/14 at the top
    const y = bass ? GR.BASS_Y : GR.STR_Y;
    const dirx = -Math.sin(ang), dirz = -Math.cos(ang);
    for (let i = 0; i < s.strings; i++) {
      const off = (i - (s.strings - 1) / 2) * 0.0042;
      const hx = keyX[n] + off, hz = GR.HAM_Z;                            // the strike point, right above the hammer
      const a = [hx - dirx * s.L * beta, y, hz - dirz * s.L * beta];
      const b = [a[0] + dirx * s.L, y, a[2] + dirz * s.L];
      const pin = [a[0] - dirx * 0.02 + (i % 2 ? 0.002 : -0.002), y + 0.03, GR.PIN_Z - (n % 2) * 0.03 - i * 0.012];
      out.push({ n, i, a, b, pin, bass, wound: s.kind === 'wound' });
    }
  }
  return out;
}

// A cylinder placed between two points inside an InstancedMesh (unit cylinder along Y).
const _o = new THREE.Object3D(), _up = new THREE.Vector3(0, 1, 0), _A = new THREE.Vector3(), _B = new THREE.Vector3();
export function placeBetween(mesh, i, a, b, r) {
  _A.set(...a); _B.set(...b);
  _o.position.copy(_A).add(_B).multiplyScalar(0.5);
  _o.quaternion.setFromUnitVectors(_up, _B.clone().sub(_A).normalize());
  _o.scale.set(r, _A.distanceTo(_B), r); _o.updateMatrix();
  mesh.setMatrixAt(i, _o.matrix);
}

export function makeGrand({ lidOpen = 0.62 } = {}) {
  const g = new THREE.Group();
  const lacquer = M.plastic(0x16181e, { roughness: 0.22, transparent: true, opacity: 1 });
  const lacquerIn = M.plastic(0x20232b, { roughness: 0.4, transparent: true, opacity: 1 });
  const spruce = M.matte(0xe9cf98, { roughness: 0.7 }), maple = M.matte(0xb9803f), brass = M.metal(0xd9b25a, { roughness: 0.3 });
  const iron = M.metal(0xc7a14c, { roughness: 0.38, metalness: 0.75 });
  const see = [lacquer, lacquerIn];

  // Case: a U-shaped rim, open at the front where the keys go in.
  const caseG = new THREE.Group(); g.add(caseG);
  const ring = [...CASE_OUT, ...[...CASE_IN].reverse()];
  const rim = slab(ring, 0.56, 0.43, lacquer); caseG.add(rim);
  const belly = box(1.36, 0.23, 0.035, lacquerIn); belly.position.set(0, 0.56 + 0.115, GR.BELLY_Z - 0.0175); caseG.add(belly);
  const keybed = box(1.36, 0.035, 0.52, lacquerIn); keybed.position.set(0, 0.575, -0.06); caseG.add(keybed);
  const slip = box(1.36, 0.045, 0.02, lacquer); slip.position.set(0, 0.655, GR.KEY_Z + 0.012); caseG.add(slip);
  // Legs and the pedal lyre.
  const legs = new THREE.Group(); g.add(legs);
  for (const [x, z] of [[-0.66, 0.05], [0.66, 0.05], [-0.4, -1.72]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.56, 24), lacquer); leg.position.set(x, 0.28, z); leg.castShadow = true; legs.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), brass); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.03, z); legs.add(wheel);
  }
  const lyre = new THREE.Group(); lyre.position.set(0, 0, 0.0); g.add(lyre);
  for (const x of [-0.09, 0.09]) lyre.add(beam([x, 0.12, 0], [x, 0.56, -0.02], 0.018, lacquer));
  const pedalBox = box(0.28, 0.08, 0.12, lacquer); pedalBox.position.set(0, 0.1, 0); lyre.add(pedalBox);
  const pedals = [-0.075, 0, 0.075].map((x) => {
    const p = new THREE.Group(); p.position.set(x, 0.08, 0.05); lyre.add(p);
    const bar = box(0.035, 0.012, 0.13, brass); bar.position.z = 0.065; p.add(bar);
    return p;
  });

  // Soundboard with ribs underneath and the two bridges on top.
  const boardG = new THREE.Group(); g.add(boardG);
  const bOut = boardOutline();
  const board = slab(bOut, GR.BOARD_Y - 0.009, 0.009, spruce); boardG.add(board);
  const ribs = new THREE.Group(); boardG.add(ribs);
  // Ribs run across the grain, roughly at right angles to the long strings.
  for (let k = 0; k < 13; k++) {
    const c = -0.42 - k * 0.11, pts = [];
    for (let x = -0.7; x <= 0.72; x += 0.01) { const z = c + (x + 0.7) * 0.45; if (insideCase(x, z, bOut)) pts.push([x, z]); }
    if (pts.length < 4) continue;
    const a = pts[0], b = pts.at(-1);
    ribs.add(beam([a[0] + 0.02, GR.BOARD_Y - 0.02, a[1] + 0.01], [b[0] - 0.02, GR.BOARD_Y - 0.02, b[1] - 0.01], 0.011, M.matte(0xd6b27a), 6));
  }
  const layout = stringLayout();
  const bridgeCurve = (sel, y, h) => {
    const ends = layout.filter(sel).filter((s) => s.i === 0).map((s) => new THREE.Vector3(s.b[0], y, s.b[2] + 0.01));
    const grp = new THREE.Group();
    for (let i = 1; i < ends.length; i++) grp.add(beam(ends[i - 1].toArray(), ends[i].toArray(), h, maple, 6));
    return grp;
  };
  const trebleBridge = bridgeCurve((s) => !s.bass, GR.STR_Y - 0.018, 0.018);
  const bassBridge = bridgeCurve((s) => s.bass, GR.BASS_Y - 0.03, 0.022);
  boardG.add(trebleBridge, bassBridge);

  // Strings: steel for plain, copper for wound. Instanced so each one can light up when it rings.
  const strG = new THREE.Group(); g.add(strG);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  const plainL = layout.filter((s) => !s.wound), woundL = layout.filter((s) => s.wound);
  const steel = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.25 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.35 });
  const plain = new THREE.InstancedMesh(cyl, steel, plainL.length), wound = new THREE.InstancedMesh(cyl, copper, woundL.length);
  const baseCol = { plain: new THREE.Color(0xdfe4ea), wound: new THREE.Color(0xd08448) };
  const strIdx = [];   // per key: [[mesh, index], ...]
  [[plain, plainL, 'plain'], [wound, woundL, 'wound']].forEach(([mesh, list, kind]) => {
    list.forEach((s, i) => {
      const r = kind === 'wound' ? clamp(SCALE[s.n].D / 2, 0.0012, 0.003) : 0.0007;
      const back = [s.b[0] + (s.b[0] - s.a[0]) * 0.035, s.b[1], s.b[2] + (s.b[2] - s.a[2]) * 0.035];
      placeBetween(mesh, i, s.pin, back, r * 1.3);
      mesh.setColorAt(i, baseCol[kind]);
      (strIdx[s.n] ||= []).push([mesh, i, kind]);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.castShadow = true;
    strG.add(mesh);
  });

  // Cast-iron plate: a frame round the edge, struts across, and a wide bar over the pinblock.
  const plateG = new THREE.Group(); g.add(plateG);
  const inner = offset(CASE_IN, 0.012).filter(([, z]) => z < -0.1);
  const band = [...inner, ...[...offset(inner, 0.07)].reverse()];
  plateG.add(slab(band, 0.855, 0.022, iron));
  const front = box(1.34, 0.022, 0.2, iron); front.position.set(0, 0.866, -0.07); plateG.add(front);
  const struts = [[[-0.62, -0.14], [-0.62, -1.62]], [[-0.34, -0.17], [-0.4, -1.84]], [[-0.08, -0.17], [-0.12, -1.7]], [[0.2, -0.17], [0.22, -1.2]], [[0.46, -0.17], [0.5, -0.78]]];
  struts.forEach(([a, b]) => plateG.add(beam([a[0], 0.885, a[1]], [b[0], 0.885, b[1]], 0.016, iron, 8)));
  // Tuning pins, one per string, in the pinblock under the plate.
  const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.05, 8), M.metal(0xc9ced6), layout.length);
  layout.forEach((s, i) => { _o.position.set(s.pin[0], 0.89, s.pin[2]); _o.quaternion.identity(); _o.scale.set(1, 1, 1); _o.updateMatrix(); pins.setMatrixAt(i, _o.matrix); });
  plateG.add(pins);
  const pinblock = box(1.34, 0.05, 0.2, maple); pinblock.position.set(0, 0.83, -0.07); plateG.add(pinblock);

  // Keyboard and action: they slide out together (and shift sideways for the soft pedal).
  const actionG = new THREE.Group(); g.add(actionG);
  const kb = makeKeys(1, 88); kb.group.position.set(0, GR.KEY_Y, GR.KEY_Z); actionG.add(kb.group);
  const fall = box(1.34, 0.07, 0.17, lacquer); fall.position.set(0, 0.77, -0.035); actionG.add(fall);
  // Hammers: a shank from the flange rail back to a felt head right under the strings.
  const hamHead = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.matte(0xf3efe6), 88);
  const hamCore = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.matte(0xc79a62), 88);
  const hamShank = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.matte(0xd8b884), 88);
  [hamHead, hamCore, hamShank].forEach((m) => { m.castShadow = true; actionG.add(m); });
  const flangeRail = box(1.3, 0.02, 0.025, maple); flangeRail.position.set(0, GR.FLANGE_Y + 0.02, GR.FLANGE_Z); actionG.add(flangeRail);
  // Dampers sit on the strings from above (keys 1–69); wires run down to levers behind the keys.
  const dampG = new THREE.Group(); g.add(dampG);
  const dampHead = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.matte(0xb88a55), DAMPED_TO);
  const dampFelt = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.matte(0x30333c), DAMPED_TO);
  const dampWire = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0012, 0.0012, 1, 5), M.metal(0xc9ced6), DAMPED_TO);
  [dampHead, dampFelt, dampWire].forEach((m) => { m.castShadow = true; dampG.add(m); });
  const guideRail = box(1.1, 0.012, 0.03, maple); guideRail.position.set(-0.1, GR.STR_Y + 0.07, GR.DAMP_Z); dampG.add(guideRail);

  // Lid, hinged along the spine, with its prop stick.
  const lidHinge = new THREE.Group(); lidHinge.position.set(-0.74, 0.99, 0); g.add(lidHinge);
  const lid = slab(CASE_OUT.map(([x, z]) => [x + 0.74, z]), 0, 0.018, lacquer); lidHinge.add(lid);
  const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 10), lacquer); prop.castShadow = true; g.add(prop);

  const st = { key: new Float32Array(89), ham: new Float32Array(89), damp: new Float32Array(89), glow: new Float32Array(89), shift: 0, lid: lidOpen };
  const col = new THREE.Color(), hot = new THREE.Color(0x8ef0ff);
  const api = {
    group: g, caseG, rim, lid, lidHinge, prop, legs, lyre, pedals, boardG, board, ribs, trebleBridge, bassBridge, strG, plateG, actionG, dampG, keys: kb.keys, pickables: kb.pickables, layout, see,
    setXray(on) { see.forEach((m) => { m.opacity = on ? 0.18 : 1; m.depthWrite = !on; }); },
    setLid(a) { st.lid = a; },
    setKey(n, v) { st.key[n] = v; }, setHammer(n, v) { st.ham[n] = v; }, setDamper(n, v) { st.damp[n] = v; }, glow(n, v) { st.glow[n] = Math.max(st.glow[n], v); },
    setShift(v) { st.shift = v; },
    state: st,
    // Apply the state to the meshes. fade: how fast string glows fade (per second).
    update(dt = 0, fade = 1.2) {
      lidHinge.rotation.z = st.lid;
      const tip = new THREE.Vector3(1.2, 0, -0.75).applyEuler(lidHinge.rotation).add(lidHinge.position);
      prop.visible = st.lid > 0.08;
      const foot = new THREE.Vector3(0.5, 0.99, -0.75);
      prop.position.copy(foot).add(tip).multiplyScalar(0.5); prop.scale.y = foot.distanceTo(tip);
      prop.quaternion.setFromUnitVectors(_up, tip.clone().sub(foot).normalize());
      actionG.position.x = st.shift * 0.0042;
      for (let n = 1; n <= 88; n++) {
        kb.keys[n].set(st.key[n]);
        const bass = n <= BASS_BRIDGE_TO, x = keyX[n];
        // Hammer: shank turns about its flange; the head rises GR.BLOW (45 mm) to reach the strings.
        const extra = bass ? GR.BASS_Y - GR.STR_Y : 0;
        const R = GR.FLANGE_Z - GR.HAM_Z, top = GR.STR_Y + extra - GR.BLOW - 0.001 - GR.FLANGE_Y;   // head height, flange to felt top
        const phi = Math.asin(clamp((GR.BLOW * st.ham[n]) / R, -1, 1)), c = Math.cos(phi), sn = Math.sin(phi);
        const at = (u) => [x, GR.FLANGE_Y + u * c + R * sn, GR.FLANGE_Z + u * sn - R * c];   // a point u up the head, turned with the shank
        const w = n <= 30 ? 0.013 : 0.011;
        _o.rotation.set(phi, 0, 0);
        _o.position.set(...at(top * 0.72)); _o.scale.set(w, top * 0.56, 0.03); _o.updateMatrix(); hamHead.setMatrixAt(n - 1, _o.matrix);
        _o.position.set(...at(top * 0.22)); _o.scale.set(w * 0.8, top * 0.44, 0.02); _o.updateMatrix(); hamCore.setMatrixAt(n - 1, _o.matrix);
        _o.position.set(x, GR.FLANGE_Y + (R / 2) * sn, GR.FLANGE_Z - (R / 2) * c); _o.scale.set(0.005, 0.006, R); _o.updateMatrix(); hamShank.setMatrixAt(n - 1, _o.matrix);
        // Damper: rests on the strings, lifts up to 10 mm.
        if (n <= DAMPED_TO) {
          const sy = bass ? GR.BASS_Y : GR.STR_Y, lift = st.damp[n] * 0.012, dz = GR.DAMP_Z;
          const sx = x;
          _o.rotation.set(0, 0, 0);
          _o.position.set(sx, sy + 0.002 + lift + 0.006, dz); _o.scale.set(0.011, 0.012, 0.024); _o.updateMatrix(); dampFelt.setMatrixAt(n - 1, _o.matrix);
          _o.position.set(sx, sy + 0.014 + lift + 0.012, dz); _o.scale.set(0.011, 0.024, 0.02); _o.updateMatrix(); dampHead.setMatrixAt(n - 1, _o.matrix);
          _o.position.set(sx, (sy + 0.03 + lift + GR.KEY_Y - 0.05) / 2, dz); _o.scale.set(1, sy + 0.03 + lift - (GR.KEY_Y - 0.05), 1); _o.updateMatrix(); dampWire.setMatrixAt(n - 1, _o.matrix);
        }
        // String glow.
        if (st.glow[n] > 0.002 || dt === 0) {
          st.glow[n] = Math.max(0, st.glow[n] - dt * fade * st.glow[n] - dt * 0.02);
          for (const [mesh, i, kind] of strIdx[n] || []) { col.copy(baseCol[kind]).lerp(hot, clamp(st.glow[n], 0, 1)); mesh.setColorAt(i, col); mesh.instanceColor.needsUpdate = true; }
        }
      }
      [hamHead, hamCore, hamShank, dampHead, dampFelt, dampWire].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    },
  };
  api.update(0);
  return api;
}

// A simple played-note model shared by chapters with a keyboard: press → the hammer flies up,
// strikes and falls back; the damper lifts while the key is down (or the pedal is), then drops.
// Real timings slowed down by `slow` so the eye can follow.
export function makePlayer(piano, { slow = 6, onStrike } = {}) {
  const notes = new Map();       // n → { down, t, v, struck }
  return {
    notes,
    press(n, v = 2) { notes.set(n, { down: true, t: 0, v, struck: false }); },
    lift(n) { const s = notes.get(n); if (s) s.down = false; },
    update(dt, { sustain = false, held = null } = {}) {
      for (const [n, s] of notes) {
        s.t += dt / slow;
        // Key goes down in ~ 10 mm / key speed (hammer speed ÷ 5, the action ratio).
        const keyT = 0.01 / (s.v / 5);
        const kd = s.down ? clamp(s.t / keyT, 0, 1) : Math.max(0, (piano.state.key[n] || 0) - dt / slow / 0.06);
        piano.setKey(n, kd);
        // Hammer: follows the key, flies free for the last few mm, bounces off at 60% speed and falls.
        // Hammer: follows the key and reaches the string just after the key bottoms out; it bounces
        // off at about half its speed and falls back under gravity, caught at 60% (18 mm below the
        // string) by the backcheck while the key is held.
        let h;
        const tHit = keyT * 1.05;
        if (s.t < tHit) h = clamp(s.t / tHit, 0, 1);
        else {
          if (!s.struck) { s.struck = true; onStrike?.(n, s.v); piano.glow(n, 0.35 + s.v / 8); }
          const tt = s.t - tHit, drop = 0.5 * s.v * tt + 4.9 * tt * tt;
          h = Math.max(s.down ? 0.6 : kd * 0.9, 1 - drop / 0.045);
        }
        piano.setHammer(n, h);
        const damperUp = sustain || (held ? held(n) : false) || kd > 0.5;
        const cur = piano.state.damp[n] || 0;
        piano.setDamper(n, damperUp ? Math.min(1, cur + dt / slow / 0.02) : Math.max(0, cur - dt / slow / 0.03));
        if (!s.down && kd <= 0 && h <= 0.001 && !damperUp && cur <= 0) notes.delete(n);
      }
    },
  };
}

// On a phone the readout sits over the model, so keep its headline and first rows only.
export function compact(html, stage, rows = 2) {
  if (stage.host.clientWidth >= 560) return html;
  let k = 0;
  return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="(row|no)">[\s\S]*?<\/div>/g, (m) => (++k <= rows ? m : ''));
}

export { TAU };
