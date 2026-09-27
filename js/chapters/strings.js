// Chapter 3: a vibrating string. Mersenne's laws, f = (1/2L)·√(T/μ), standing waves and overtones,
// and the stiffness of steel that pushes the overtones slightly sharp (inharmonicity).
import { THREE, M, box, clamp, canvasTexture } from '../kit.js';
import { synth, SCALE, G, UTS, muSteel, muWound, freqFrom, inharm, nearest, compact } from '../piano.js';

const U = 6;                                // 1 scene unit ≈ 17 cm
const Y = 1.7;                              // height of the main string
const NSEG = 160;
const WIND = { 0: 0, 1: 0.6e-3, 2: 1.8e-3 };  // copper winding wire diameter, m
const BETA = 1 / 8;                         // strike point, as a fraction of the length
const kgf = (N) => N / G;

// Everything about the string, from the sliders.
function physics(s) {
  const L = s.len, T = s.kg * G, d = s.d * 1e-3, dw = WIND[s.wind];
  const mu = dw ? muWound(d, dw) : muSteel(d);
  const f = freqFrom(L, T, mu), B = inharm(d, T, L);
  const stress = T / (Math.PI * d * d / 4);
  const partial = (k) => k * f * Math.sqrt(1 + B * k * k);
  return { L, T, d, dw, D: d + 2 * dw, mu, f, B, stress, frac: stress / UTS, partial };
}
// Set the sliders to one of the piano's own strings.
function preset(s, n) {
  const sc = SCALE[n];
  s.len = sc.L; s.kg = kgf(sc.T); s.d = sc.d * 1e3;
  s.wind = sc.kind === 'wound' ? (sc.D - sc.d > 2e-3 ? 2 : 1) : 0;
}

export default {
  id: 'strings',
  short: 'Strings',
  title: 'What sets a string’s note',
  subtitle: 'Length, tension and weight: Mersenne’s three laws.',
  view: { pos: [0.2, 3.2, 8.2], target: [0.9, 1.9, 0] },
  learn: `<p>Hit a string and it bends, then springs back, overshoots and swings to and fro hundreds of times a second. That swinging is its <b>frequency</b>, measured in <b>hertz</b> (Hz): swings per second. The higher the frequency, the higher the note.</p>
    <p>Three things set it. A <b>shorter</b> string swings faster: half the length, double the frequency, one <b>octave</b> up. A <b>tighter</b> string swings faster too, but only with the square root: four times the tension for one octave. A <b>heavier</b> string swings slower. Marin Mersenne wrote these rules down in 1636: <b>f = (1/2L) × √(T/μ)</b>, where μ is the mass of one metre of string.</p>
    <p>A string doesn't just swing as a whole. It also swings in halves, thirds and quarters at the same time. These <b>overtones</b> (harmonics) are 2, 3, 4 times the main note, and their mix gives the piano its sound. Steel is stiff, so on a piano they come out a little <b>sharp</b>. Low notes would need impossibly long strings, so the bass strings are <b>wound with copper</b>: heavier, but still bendy.</p>
    <p class="tip"><b>Try it:</b> halve the length and watch the note go up an octave. Then show each overtone on its own.</p>`,
  terms: [
    { t: 'Frequency', d: 'How many times a second something swings back and forth, measured in hertz (Hz).' },
    { t: 'Tension', d: 'How hard the string is pulled tight, measured in newtons or kilograms of pull.' },
    { t: 'Overtone', d: 'A higher, quieter vibration of a string in 2, 3, 4… parts, sounding along with the main note.' },
    { t: 'Node', d: 'A point on a vibrating string that stays still.' },
    { t: 'Inharmonicity', d: 'Overtones coming out slightly higher than exact multiples, because steel is stiff.' },
  ],
  defaults: { len: 0.419, kg: 81, d: 0.97, wind: 0, show: 0, preset: 49 },
  onChange(s, key) { if ((key === 'preset' || key === null) && s.preset) preset(s, s.preset); if (['len', 'kg', 'd', 'wind'].includes(key)) s.preset = 0; },
  controls: [
    { key: 'preset', type: 'seg', label: 'Start from a piano string', options: [{ v: 1, label: 'A0' }, { v: 40, label: 'C4' }, { v: 49, label: 'A4' }, { v: 88, label: 'C8' }], fmt: (v) => (v ? '' : 'your own') },
    { key: 'len', type: 'log', label: 'Length', min: 0.04, max: 1.6, fmt: (v) => (v < 1 ? Math.round(v * 100) + ' cm' : v.toFixed(2) + ' m') },
    { key: 'kg', type: 'range', label: 'Tension', min: 10, max: 200, step: 1, fmt: (v) => `${Math.round(v)} kg of pull (${Math.round(v * G)} N)` },
    { key: 'd', type: 'range', label: 'Steel wire thickness', min: 0.6, max: 1.8, step: 0.01, fmt: (v) => v.toFixed(2) + ' mm' },
    { key: 'wind', type: 'seg', label: 'Copper winding', options: [{ v: 0, label: 'None' }, { v: 1, label: 'Thin' }, { v: 2, label: 'Thick' }] },
    { key: 'show', type: 'seg', label: 'Show the vibration', options: [{ v: 0, label: 'All' }, { v: 1, label: '1st' }, { v: 2, label: '2nd' }, { v: 3, label: '3rd' }, { v: 4, label: '4th' }] },
    { key: 'hit', type: 'buttons', label: 'Hear it', items: [{ label: '♪ Strike the string', act: (s, inst) => inst.strike() }] },
  ],
  quiz: [
    { q: 'You halve the length of a string and keep everything else the same. What happens to the note?', options: ['It goes down an octave', 'It goes up an octave (double the frequency)', 'It stays the same', 'It goes up a tiny bit'], answer: 1, why: 'Frequency is proportional to 1/L. Half the length, twice the frequency: one octave higher.' },
    { q: 'How much tighter must a string be pulled to sound one octave higher?', options: ['Twice as tight', 'Four times as tight', 'Eight times as tight', 'Half as tight'], answer: 1, why: 'Frequency grows with the square root of tension: √4 = 2.' },
    { q: 'Why are a piano’s bass strings wrapped in copper wire?', options: ['To make them shiny', 'To add weight without making them stiff, so they can be low but not too long', 'To stop them rusting', 'To conduct electricity'], answer: 1, why: 'A heavier string vibrates more slowly. Winding adds mass while the thin steel core keeps it flexible.' },
  ],
  reel: [
    { ms: 5600, caption: 'A struck string vibrates as a whole, and in halves, thirds and quarters at the same time.', set: { preset: 40, show: 0 }, act: (s, inst) => inst.strike(true), view: { pos: [0.3, 2.9, 7.6], target: [0.3, 1.9, 0] }, spin: 0 },
    { ms: 5200, caption: 'Halve its length and the note goes up an octave: twice as many vibrations a second.', set: { preset: 0, len: 0.678, kg: 82, d: 1.01, wind: 0, show: 1 }, anim: { len: [0.678, 0.339, true] }, act: (s, inst) => inst.strike(true), view: { pos: [0.3, 2.9, 7.6], target: [0.3, 1.9, 0] }, spin: 0 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    // A long bench (a monochord) with a tuning pin at one end and a hitch pin at the other.
    const steel = M.metal(0x8f97a6, { roughness: 0.4 });
    const bench = box(9.2, 0.62, 1.1, M.matte(0x5a3b24)); bench.position.set(0, Y - 1.19, 0); root.add(bench);
    const top = box(9.2, 0.08, 1.12, M.matte(0x7a5534)); top.position.set(0, Y - 0.86, 0); root.add(top);
    const legs = [-4.2, 4.2].map((x) => { const l = box(0.3, 0.2, 0.9, M.matte(0x4a3020)); l.position.set(x, 0.1, 0); root.add(l); return l; });
    const bridgeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 3); bridgeGeo.rotateX(Math.PI / 2);
    const leftB = new THREE.Mesh(bridgeGeo, M.matte(0xb9803f)), rightB = new THREE.Mesh(bridgeGeo, M.matte(0xb9803f));
    const postGeo = new THREE.BoxGeometry(0.16, 0.86, 0.5);
    const leftP = new THREE.Mesh(postGeo, M.matte(0xb9803f)), rightP = new THREE.Mesh(postGeo, M.matte(0xb9803f));
    [leftB, rightB, leftP, rightP].forEach((m) => { m.castShadow = true; root.add(m); });
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12), steel); root.add(peg);
    // The string itself: a segmented tube we bend every frame.
    const sGeo = new THREE.CylinderGeometry(1, 1, 1, 8, NSEG, true); sGeo.rotateZ(-Math.PI / 2); sGeo.translate(0.5, 0, 0);
    const base = Float32Array.from(sGeo.attributes.position.array);
    const sMat = M.metal(0xe6eaf0, { roughness: 0.2 });
    const str = new THREE.Mesh(sGeo, sMat); str.castShadow = true; root.add(str);
    // Ghost outline of the widest swing, and node markers.
    const nodeGeo = new THREE.SphereGeometry(0.07, 12, 8), nodeMat = M.glow(0xffb547);
    const nodes = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(nodeGeo, nodeMat); root.add(m); return m; });
    const envPts = new Float32Array((NSEG + 1) * 3 * 2);
    const env = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x8ef0ff, transparent: true, opacity: 0.5 }));
    env.geometry.setAttribute('position', new THREE.BufferAttribute(envPts, 3)); root.add(env);
    const env2 = new THREE.Line(new THREE.BufferGeometry(), env.material); env2.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NSEG + 1) * 3), 3)); root.add(env2);

    // A board showing the overtones as bars: 1st to 8th, with their frequencies.
    const spec = { p: null, a: [] };
    const board = canvasTexture(900, 300, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '26px sans-serif'; g.fillText('Overtones in this string’s sound', 24, 40);
      if (!spec.p) return;
      const n = 8, bw = (w - 60) / n;
      for (let k = 1; k <= n; k++) {
        const a = spec.a[k] || 0, x = 30 + (k - 1) * bw, bh = a * 150;
        g.fillStyle = k === 1 ? '#8ef0ff' : '#ffb547'; g.fillRect(x + 10, 220 - bh, bw - 20, bh);
        g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '22px sans-serif';
        const f = spec.p.partial(k);
        g.fillText(f < 1000 ? f.toFixed(0) + ' Hz' : (f / 1000).toFixed(2) + ' kHz', x + 6, 250);
        g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '19px sans-serif';
        const off = 1200 * Math.log2(f / (k * spec.p.f));
        g.fillText(k === 1 ? 'main note' : `×${k} ${off >= 0.5 ? '+' + off.toFixed(0) + '¢' : ''}`, x + 6, 280);
      }
    });
    const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.2), new THREE.MeshBasicMaterial({ map: board.tex, transparent: true, side: THREE.DoubleSide }));
    bMesh.position.set(3.7, Y + 1.5, -1.8); bMesh.rotation.y = -0.45; bMesh.scale.setScalar(0.72); root.add(bMesh);

    const lLen = stage.label('', [0, Y - 0.62, 0.7]);
    const lNote = stage.label('', [0, Y + 0.95, 0], root, 'hot');
    const lSnap = stage.label('Snap! Too tight for this wire.', [0, Y + 0.4, 0.3], root, 'hot'); lSnap.visible = false;

    // Vibration state: amplitudes of each partial, set by a strike, decaying away.
    const K = 8, amp = new Float32Array(K + 1), phase = new Float32Array(K + 1);
    let lastS = s0, clock = 0, drawnKey = '';
    const api = {
      strike(silent = false) {
        const s = lastS, p = physics(s);
        for (let k = 1; k <= K; k++) { amp[k] = (Math.abs(Math.sin(k * Math.PI * BETA)) / k) * 1.0; phase[k] = 0; }
        clock = 0;
        if (!silent && p.frac < 1 && p.f > 15 && p.f < 8000) { const nn = nearest(p.f); synth.strike(clamp(nn.n, 1, 88), 2.5, { freq: p.f, B: p.B }); }
      },
    };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        lastS = s;
        synth.sync();
        const p = physics(s), Lw = p.L * U, x0 = -Lw / 2;
        const snapped = p.frac >= 1;
        // Supports, pin and bench follow the length.
        leftB.position.set(x0, Y - 0.12, 0); rightB.position.set(x0 + Lw, Y - 0.12, 0);
        leftP.position.set(x0 - 0.25, Y - 0.5, 0); rightP.position.set(x0 + Lw + 0.25, Y - 0.5, 0);
        peg.position.set(x0 - 0.25, Y + 0.05, 0);
        // The bench grows and shrinks with the string.
        const bl = Lw + 1.6; bench.scale.x = top.scale.x = bl / 9.2;
        legs.forEach((l, i) => { l.position.x = (i ? 1 : -1) * (bl / 2 - 0.4); });
        // Thickness drawn 20× bigger than life.
        const r = Math.max(0.012, (p.D / 2) * U * 20);
        sMat.color.set(p.dw ? 0xd08448 : 0xe6eaf0);
        str.visible = !snapped; lSnap.visible = snapped;
        // Drawn vibration: the real frequencies are far too fast to see, so the fundamental is shown
        // at about 1 swing a second and the overtones at 2, 3, 4… times that (their real ratios).
        clock += dt;
        const shown = s.show;
        const aScale = 0.55;
        const pos = str.geometry.attributes.position;
        const decay = Math.exp(-dt * 0.25);
        for (let k = 1; k <= K; k++) { amp[k] *= Math.pow(decay, 1 + 0.3 * k); phase[k] += dt * TAU_VIS * (p.partial(k) / p.f); }
        for (let i = 0; i < pos.count; i++) {
          const u = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
          let y = 0;
          for (let k = 1; k <= K; k++) if (!shown || shown === k) y += (shown ? 0.9 / k * (k === 1 ? 1 : 1.6) : 1) * amp[k] * Math.sin(k * Math.PI * u) * Math.cos(phase[k]);
          pos.array[i * 3] = x0 + u * Lw; pos.array[i * 3 + 1] = Y + by * r + y * aScale * Math.min(1, Lw / 2.5); pos.array[i * 3 + 2] = bz * r;
        }
        pos.needsUpdate = true; str.geometry.computeBoundingSphere();
        // Envelope and nodes for a single overtone.
        const ea = env.geometry.attributes.position, eb = env2.geometry.attributes.position;
        const kk = shown || 1, A = (shown ? 0.9 / kk * (kk === 1 ? 1 : 1.6) : 1) * Math.max(amp[kk], 0) * aScale * Math.min(1, Lw / 2.5);
        for (let i = 0; i <= NSEG; i++) {
          const u = i / NSEG, yy = A * Math.sin(kk * Math.PI * u);
          ea.setXYZ(i, x0 + u * Lw, Y + yy, 0); eb.setXYZ(i, x0 + u * Lw, Y - yy, 0);
        }
        ea.needsUpdate = eb.needsUpdate = true;
        env.visible = env2.visible = !!shown && !snapped;
        nodes.forEach((m, j) => { m.visible = !!shown && j <= kk && !snapped; m.position.set(x0 + (j / kk) * Lw, Y, 0); });
        lLen.element.textContent = `${p.L < 1 ? Math.round(p.L * 100) + ' cm' : p.L.toFixed(2) + ' m'} long`;
        const nn = nearest(p.f);
        lNote.element.textContent = snapped ? '' : `${p.f < 1000 ? p.f.toFixed(1) : Math.round(p.f)} Hz`;
        lNote.position.set(0, Y + 0.95, 0);
        // Board: partial strengths from where the hammer strikes (1/8 of the length).
        const key = `${p.f.toFixed(2)}|${p.B.toExponential(2)}`;
        if (key !== drawnKey) { drawnKey = key; spec.p = p; for (let k = 1; k <= 8; k++) spec.a[k] = Math.abs(Math.sin(k * Math.PI * BETA)) / Math.sqrt(k); board.redraw(); }
        void nn;
      },
      readout: (s) => compact((() => {
        const p = physics(s), nn = nearest(p.f);
        if (p.frac >= 1) return `<div class="big no">The wire snapped</div>${s.kg} kg on a ${s.d.toFixed(2)} mm wire is ${Math.round(p.frac * 100)}% of its breaking strength. Loosen it or use thicker wire.`;
        const inRange = nn.n >= 1 && nn.n <= 88;
        return `<div class="big">${p.f < 1000 ? p.f.toFixed(1) : Math.round(p.f)} Hz${inRange ? `: ${nn.name}` : ''}</div>
          <div class="row"><span>Nearest piano key</span><b>${inRange ? `${nn.name} ${Math.abs(nn.cents) < 3 ? '(in tune)' : `${nn.cents > 0 ? '+' : ''}${nn.cents.toFixed(0)} cents`}` : nn.name}</b></div>
          <div class="row"><span>Weight of 1 m of string (μ)</span><b>${(p.mu * 1000).toFixed(1)} g</b></div>
          <div class="row"><span>Pull on the wire</span><b ${p.frac > 0.75 ? 'class="no"' : ''}>${Math.round(p.frac * 100)}% of breaking strength</b></div>
          <div class="row"><span>2nd overtone</span><b>${p.partial(2).toFixed(1)} Hz (exactly double: ${(2 * p.f).toFixed(1)})</b></div>
          <small>f = (1/2L)·√(T/μ). Real pianos run their wires at about 40 to 60% of breaking strength.</small>`;
      })(), stage),
      dispose() { synth.allOff(); },
    };
  },
};
const TAU_VIS = Math.PI * 2 * 0.9;            // fundamental drawn at 0.9 swings a second
