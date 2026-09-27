// Chapter 5: 88 keys and equal temperament. A0 = 27.5 Hz to C8 = 4,186 Hz; every key is 2^(1/12)
// times the one below, so 12 keys make an octave (×2). Unisons of 1, 2 or 3 strings, and stretch tuning.
import { THREE, M, clamp, canvasTexture } from '../kit.js';
import { synth, keyInput, makeKeys, keyX, SCALE, freqOf, nameOf, isBlack, stretchCents, SEMI, placeBetween, KEY, compact } from '../piano.js';

const S = 5;                                          // 1 scene unit = 20 cm
const KB_Z = 2.2;                                     // front edge of the keyboard

export default {
  id: 'scale',
  short: '88 keys',
  title: 'Eighty-eight keys, twelve to an octave',
  subtitle: 'From 27.5 Hz to 4,186 Hz, each key 6% higher than the last.',
  view: { pos: [1.2, 9.4, 9.2], target: [0.2, 0.4, -2.2] },
  learn: `<p>A piano has <b>88 keys</b>, from A0 at <b>27.5 Hz</b> to C8 at <b>4,186 Hz</b>. That's seven octaves and a bit. The A above middle C, <b>A4</b>, is tuned to <b>440 Hz</b>, and every other note is worked out from it.</p>
    <p>Go up one key, white or black, and the frequency goes up by the same small step: × 1.0595, the twelfth root of 2. After <b>12 steps</b> you have multiplied by exactly 2, which is one <b>octave</b>. This way of tuning is called <b>equal temperament</b>. Every key is equally in tune (and equally slightly out), so music sounds the same in any key.</p>
    <p>Behind the keys you can see each note's strings at their real lengths. Low notes get <b>one</b> thick copper-wound string, the middle <b>two</b>, and most notes <b>three</b>, tuned together as a <b>unison</b> so they sound louder and ring longer. Tuners also <b>stretch</b> the octaves a little, low notes slightly flat and high notes slightly sharp, because stiff steel strings have overtones that are a touch sharp.</p>
    <p class="tip"><b>Try it:</b> click keys, or play with A S D F G H J K (W E T Y U for black keys, Z and X to change octave). Play every A and watch the frequency double.</p>`,
  terms: [
    { t: 'Octave', d: 'The jump from one note to the next with the same name: the frequency doubles.' },
    { t: 'Semitone', d: 'The step from one key to the very next one, white or black: × 1.0595.' },
    { t: 'Equal temperament', d: 'Tuning where every semitone is exactly the same ratio, the twelfth root of 2.' },
    { t: 'Unison', d: 'Two or three strings tuned to the same note and struck by one hammer.' },
    { t: 'Stretch tuning', d: 'Tuning high notes slightly sharp and low notes slightly flat, to match the strings’ sharp overtones.' },
  ],
  defaults: { log: false, stretch: false },
  controls: [
    { key: 'log', type: 'toggle', label: 'Chart: log scale', hint: 'On a log scale, equal steps look equal.' },
    { key: 'stretch', type: 'toggle', label: 'Stretch tuning', hint: 'A typical tuner’s curve: about 30 cents flat at A0 and sharp at C8.' },
    { key: 'play', type: 'buttons', label: 'Play', items: [
      { label: '♪ Every A', act: (s, inst) => inst.seq([1, 13, 25, 37, 49, 61, 73, 85], 0.45) },
      { label: '♪ C major scale', act: (s, inst) => inst.seq([40, 42, 44, 45, 47, 49, 51, 52], 0.3) },
      { label: '♪ All 88', act: (s, inst) => inst.seq(Array.from({ length: 88 }, (_, i) => i + 1), 0.045) },
    ] },
  ],
  quiz: [
    { q: 'A4 is 440 Hz. What is A5, one octave higher?', options: ['450 Hz', '660 Hz', '880 Hz', '4,400 Hz'], answer: 2, why: 'Each octave doubles the frequency: 2 × 440 = 880 Hz.' },
    { q: 'In equal temperament, how many semitone steps make one octave?', options: ['7', '8', '12', '88'], answer: 2, why: 'Twelve equal steps of × 1.0595 multiply up to exactly × 2.' },
    { q: 'Why do most notes on a piano have three strings?', options: ['In case one breaks', 'Three strings tuned together are louder and ring longer', 'Each string plays a different note', 'To make the key heavier'], answer: 1, why: 'The hammer hits all three at once. Together they give more sound, and they pass energy between them so the note lasts.' },
  ],
  reel: [
    { ms: 6400, caption: '88 keys, from 27.5 Hz to 4,186 Hz. Each key is 1.0595 times the one below.', set: { log: false, stretch: false }, act: (s, inst) => inst.seq([1, 13, 25, 37, 49, 61, 73, 85, 88], 0.55), view: { pos: [1.4, 8.6, 8.6], target: [0.2, 0.4, -2.0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const kb = makeKeys(1, 88); kb.group.scale.setScalar(S); kb.group.position.set(0, 0.5, KB_Z); root.add(kb.group);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3 * S, 0.3, 0.55 * S), M.matte(0x1c1f27)); bed.position.set(0, 0.5 - 0.024 * S - 0.15, KB_Z - 0.26 * S); bed.receiveShadow = true; root.add(bed);
    stage.pickables.push(...kb.pickables);

    // Strings: laid straight back from each key, at their real speaking lengths.
    const plain = [], wound = [];
    for (let n = 1; n <= 88; n++) for (let i = 0; i < SCALE[n].strings; i++) (SCALE[n].kind === 'wound' ? wound : plain).push([n, i]);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    const mk = (list, col) => { const m = new THREE.InstancedMesh(cyl, new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.7, roughness: 0.3 }), list.length); m.userData.col = new THREE.Color(col); stage.root.add(m); return m; };
    const pm = mk(plain, 0xdfe4ea), wm = mk(wound, 0xd08448);
    const idx = [];
    const z0 = KB_Z - KEY.LEN * S - 0.1, y = 0.62;
    [[pm, plain], [wm, wound]].forEach(([m, list]) => list.forEach(([n, i], j) => {
      const sc = SCALE[n], sp = 0.011 * S, x = keyX[n] * S + (i - (sc.strings - 1) / 2) * sp * 0.33;
      const r = sc.kind === 'wound' ? clamp(sc.D * S * 2, 0.012, 0.04) : 0.008;
      placeBetween(m, j, [x, y, z0], [x, y, z0 - sc.L * S], r);
      m.setColorAt(j, m.userData.col); (idx[n] ||= []).push([m, j]);
    }));
    [pm, wm].forEach((m) => { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
    const railMat = M.metal(0xc7a14c, { roughness: 0.4 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.26 * S, 0.12, 0.2), railMat); rail.position.set(0, y, z0 + 0.1); root.add(rail);

    // Labels: every C, plus A0, A4 and C8.
    const narrow = () => stage.host.clientWidth < 560;
    const labels = [];
    for (const n of [1, 28, 40, 49, 64, 88]) {
      const main = [1, 40, 49, 88].includes(n);
      const l = stage.label(`${nameOf(n)} · ${freqOf(n) < 100 ? freqOf(n).toFixed(1) : Math.round(freqOf(n)).toLocaleString('en')} Hz`, [keyX[n] * S, 0.62, KB_Z + 0.3 + (n === 49 ? 0.45 : 0)], root, n === 49 ? 'hot' : '');
      labels.push({ l, main });
    }
    const lStr = stage.label('1 string, copper-wound', [keyX[3] * S - 0.9, y + 0.2, z0 - 7.0], root);
    const l2 = stage.label('2 strings', [keyX[20] * S + 0.3, y + 0.2, z0 - 6.6], root);
    const l3 = stage.label('3 strings, plain steel', [keyX[60] * S + 0.4, y + 0.2, z0 - 1.6], root);
    void lStr; void l2; void l3;

    // Chart: frequency of every key, straight or on a log scale; the stretch curve as a small inset.
    const cs = { log: false, stretch: false, n: 0 };
    const chart = canvasTexture(720, 480, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      const x0 = 90, y0 = h - 60, cw = w - 120, chh = h - 130;
      const fy = (f) => (cs.log ? Math.log2(f / 27.5) / Math.log2(4186 / 27.5) : f / 4186);
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 2; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '20px sans-serif';
      const ticks = cs.log ? [27.5, 55, 110, 220, 440, 880, 1760, 3520] : [0, 1000, 2000, 3000, 4000];
      for (const f of ticks) { const yy = y0 - chh * fy(Math.max(f, 1e-6)); if (!cs.log && f === 0) { g.fillText('0', 50, y0 + 6); continue; } g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + cw, yy); g.stroke(); g.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), 30, yy + 7); }
      g.fillText('key 1 (A0)', x0 - 20, y0 + 34); g.fillText('key 88 (C8)', x0 + cw - 100, y0 + 34);
      for (let n = 1; n <= 88; n++) {
        const f = freqOf(n), xx = x0 + ((n - 1) / 87) * cw, yy = y0 - chh * fy(f);
        g.fillStyle = n === cs.n ? '#ffffff' : n % 12 === 1 ? '#ffb547' : isBlack(n) ? '#4f7ecf' : '#8ef0ff';
        g.beginPath(); g.arc(xx, yy, n === cs.n ? 9 : n % 12 === 1 ? 6 : 3.5, 0, Math.PI * 2); g.fill();
      }
      g.font = 'bold 24px sans-serif'; g.fillStyle = '#8ef0ff'; g.fillText(cs.log ? 'Frequency, log scale: a straight line' : 'Frequency of each key: it doubles every 12', 24, 38);
      g.fillStyle = '#ffb547'; g.font = '19px sans-serif'; g.fillText('orange: every A', 24, 64);
      if (cs.stretch) {
        const ix = x0 + 20, iy = 90, iw = 250, ih = 110;
        g.fillStyle = 'rgba(20,24,34,.95)'; g.fillRect(ix, iy, iw, ih);
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(ix, iy + ih / 2); g.lineTo(ix + iw, iy + ih / 2); g.stroke();
        g.strokeStyle = '#ff7a59'; g.lineWidth = 4; g.beginPath();
        for (let n = 1; n <= 88; n++) { const xx = ix + ((n - 1) / 87) * iw, yy = iy + ih / 2 - (stretchCents(n) / 35) * (ih / 2 - 8); n > 1 ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
        g.stroke(); g.fillStyle = '#ff7a59'; g.font = '17px sans-serif'; g.fillText('stretch: ±30 cents', ix + 8, iy + 20);
      }
    });
    const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.8), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, side: THREE.DoubleSide }));
    cMesh.position.set(3.4, 2.4, -3.6); cMesh.rotation.set(-0.35, -0.3, 0); cMesh.scale.setScalar(1.15); root.add(cMesh);

    // Playing: keys go down and come back, strings glow and fade.
    const press = new Float32Array(89), glow = new Float32Array(89);
    const queue = [];
    let clock = 0, last = 0, lastS = { stretch: false };
    const col = new THREE.Color(), hot = new THREE.Color(0x8ef0ff);
    const play = (n, v = 2.2) => {
      press[n] = 1; glow[n] = 1; last = n;
      synth.strike(n, v, { cents: lastS.stretch ? stretchCents(n) : 0 });
    };
    const api = {
      seq(list, gap) { queue.length = 0; list.forEach((n, i) => queue.push({ at: clock + i * gap, n })); },
    };
    let base0 = 40;
    const held = new Set();
    const off = keyInput({ onDown: (k) => { const n = base0 + k; if (n > 88) return 0; play(n); held.add(n); return n; }, onUp: (n) => { held.delete(n); synth.damp(n); }, onOctave: (d) => { base0 = clamp(base0 + 12 * d, 4, 76); } });

    return {
      ...api,
      pick(o) { const n = o.userData.key; if (n) { play(n); setTimeout(() => synth.damp(n), 900); } },
      update(dt, s) {
        dt = Math.max(0, dt); clock += dt; lastS = s;
        synth.sync();
        while (queue.length && queue[0].at <= clock) play(queue.shift().n);
        for (let n = 1; n <= 88; n++) {
          if (!held.has(n)) press[n] = Math.max(0, press[n] - dt * 4);
          kb.keys[n].set(Math.min(1, press[n] * 1.6));
          if (glow[n] > 0.001 || dt === 0) {
            glow[n] *= Math.exp(-dt * 1.2);
            for (const [m, j] of idx[n] || []) { col.copy(m.userData.col).lerp(hot, glow[n]); m.setColorAt(j, col); m.instanceColor.needsUpdate = true; }
          }
        }
        labels.forEach(({ l, main }) => { l.visible = main || !narrow(); });
        if (cs.log !== s.log || cs.stretch !== s.stretch || cs.n !== last) { cs.log = s.log; cs.stretch = s.stretch; cs.n = last; chart.redraw(); }
      },
      readout: (s) => compact((() => {
        if (!last) return `<div class="big">A4 = 440 Hz</div>
          <div class="row"><span>Lowest key, A0</span><b>27.5 Hz</b></div>
          <div class="row"><span>Highest key, C8</span><b>4,186 Hz</b></div>
          <div class="row"><span>One key up</span><b>× ${SEMI.toFixed(4)}</b></div>
          <div class="row"><span>Twelve keys up</span><b>× ${(SEMI ** 12).toFixed(4)} = one octave</b></div>
          <small>Click a key or use your keyboard to play.</small>`;
        const n = last, sc = SCALE[n], c = s.stretch ? stretchCents(n) : 0, f = sc.f * 2 ** (c / 1200);
        return `<div class="big">${nameOf(n)}: ${f < 100 ? f.toFixed(2) : f.toFixed(1)} Hz</div>
          <div class="row"><span>Key number</span><b>${n} of 88 (${isBlack(n) ? 'black' : 'white'})</b></div>
          <div class="row"><span>Worked out as</span><b>440 × 2^(${n - 49}/12)${c ? ` ${c > 0 ? '+' : '−'} ${Math.abs(c).toFixed(0)} cents stretch` : ''}</b></div>
          ${n > 1 ? `<div class="row"><span>÷ the key below (${nameOf(n - 1)})</span><b>${(freqOf(n) / freqOf(n - 1)).toFixed(4)}</b></div>` : ''}
          <div class="row"><span>Strings</span><b>${sc.strings} × ${sc.kind === 'wound' ? 'copper-wound' : 'plain steel'}, ${Math.round(sc.L * 100)} cm</b></div>`;
      })(), stage),
      dispose() { off(); synth.allOff(); },
    };
  },
};
