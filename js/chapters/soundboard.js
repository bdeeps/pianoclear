// Chapter 4: the soundboard. A string alone is nearly silent: it is too thin to push much air.
// The bridge passes its vibration into a big, light board of spruce, which pumps the air.
import { THREE, M, box, beam, clamp, canvasTexture, approach } from '../kit.js';
import { synth, keyInput, SCALE, stringLayout, boardOutline, insideCase, CASE_OUT, CASE_IN, slab, levelDb, nameOf, GR, BASS_BRIDGE_TO, compact } from '../piano.js';

const S = 4;                                   // 1 scene unit = 25 cm
const OUT = boardOutline();
const XS = OUT.map((p) => p[0]), ZS = OUT.map((p) => p[1]);
const X0 = Math.min(...XS), X1 = Math.max(...XS), Z0 = Math.min(...ZS), Z1 = Math.max(...ZS);
const AREA = Math.abs(OUT.reduce((a, [x, z], i) => { const [x2, z2] = OUT[(i + 1) % OUT.length]; return a + x * z2 - x2 * z; }, 0) / 2);   // m², shoelace formula
const CROWN_MM = 6;                            // a typical crown: the board is arched up by a few millimetres
const QUIET_DB = 35;                           // a bare string on a rigid frame: roughly 35 dB (≈3,000× less sound power) quieter, an estimate
const tauOf = (n) => clamp(3.2 * 2 ** (-(n - 20) / 24), 0.22, 3.6);   // same decay as the synth: time constant of the main partial, s
const V = 2.5;                                 // hammer speed for these strikes, m/s (mezzo-forte)

export default {
  id: 'soundboard',
  short: 'The soundboard',
  title: 'Why a piano is loud',
  subtitle: 'A thin string can’t push air. A big wooden board can.',
  view: { pos: [3.4, 8.4, 9.4], target: [0.8, 2.0, -0.6] },
  learn: `<p>A string on its own makes very little sound. It is so thin that the air just slips around it as it swings. Stretch a piano string on a heavy steel frame and you can barely hear it.</p>
    <p>So the strings press down on a <b>bridge</b>, a long strip of hard wood glued to the <b>soundboard</b>. The soundboard is a big, thin sheet of <b>spruce</b>, about 9 mm thick and over a square metre in area. The strings shake the bridge, the bridge shakes the board, and the board pushes a lot of air. That is the sound you hear.</p>
    <p>Wooden <b>ribs</b> are glued across the grain underneath to make it stiff, and the board is <b>crowned</b>: arched up a few millimetres so it pushes back against the strings. There is a trade-off. A board that gives the string's energy to the air quickly makes the note <b>loud</b>, but it also fades sooner. With no soundboard, a note is quiet but rings for much longer.</p>
    <p class="tip"><b>Try it:</b> strike a note, then take the soundboard away and strike it again. Compare the two lines on the chart.</p>`,
  terms: [
    { t: 'Soundboard', d: 'A thin, wide sheet of spruce under the strings that turns their vibration into sound.' },
    { t: 'Bridge', d: 'A strip of hard wood on the soundboard. The strings press on it and pass their vibration into the board.' },
    { t: 'Ribs', d: 'Strips of wood glued across the underside of the soundboard to stiffen it.' },
    { t: 'Crown', d: 'The slight upward arch of the soundboard, which helps it hold up against the strings.' },
    { t: 'Sustain', d: 'How long a note keeps sounding after it is struck.' },
  ],
  defaults: { board: true, ribs: false, crown: false, note: 40 },
  controls: [
    { key: 'board', type: 'toggle', label: 'Soundboard fitted', hint: 'Off: the strings sit on a heavy steel frame instead.' },
    { key: 'ribs', type: 'toggle', label: 'See the ribs underneath' },
    { key: 'crown', type: 'toggle', label: 'Show the crown (30× taller)' },
    { key: 'note', type: 'seg', label: 'Note', options: [{ v: 16, label: 'C2' }, { v: 40, label: 'C4' }, { v: 49, label: 'A4' }, { v: 64, label: 'C6' }] },
    { key: 'hit', type: 'buttons', label: 'Hear it', items: [{ label: '♪ Strike the note', act: (s, inst) => inst.strike(s.note) }] },
  ],
  quiz: [
    { q: 'Why is a string on its own so quiet?', options: ['It vibrates too slowly', 'It is so thin that air slips around it instead of being pushed', 'Steel doesn’t vibrate', 'The tension stops it'], answer: 1, why: 'A string only pushes a tiny sliver of air. A soundboard has thousands of times more area.' },
    { q: 'What carries the vibration from the strings into the soundboard?', options: ['The hammers', 'The bridge', 'The pedals', 'The keys'], answer: 1, why: 'The strings press down on the bridge, which is glued to the soundboard.' },
    { q: 'Take the soundboard away and strike a note. What happens?', options: ['It is louder and shorter', 'It is much quieter but rings for longer', 'It sounds exactly the same', 'It goes out of tune'], answer: 1, why: 'The soundboard is how the string loses energy to the air. Without it the energy stays in the string: quiet, but long.' },
  ],
  reel: [
    { ms: 6400, caption: 'A bare string is almost silent. The soundboard turns its shaking into sound.', set: { board: true, ribs: true, crown: false, note: 40 }, act: (s, inst) => inst.strike(40), view: { pos: [2.6, 8.4, 8.4], target: [0.2, 2.0, -0.6] }, spin: 0.2 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); root.scale.setScalar(S); root.position.set(0, -1.1, 4.4); stage.root.add(root);
    const Yb = GR.BOARD_Y;

    // The case around it, for scale.
    const lacquer = M.plastic(0x16181e, { roughness: 0.25, transparent: true, opacity: 0.5, depthWrite: false });
    root.add(slab([...CASE_OUT, ...[...CASE_IN].reverse()], 0.56, 0.43, lacquer));

    // Soundboard: a grid we can bend (for the crown and the vibration), cut to shape by a texture.
    const W = X1 - X0, H = Z1 - Z0, NX = 56, NZ = 64;
    const geo = new THREE.PlaneGeometry(W, H, NX, NZ); geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, Yb, (Z0 + Z1) / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - X0) / W, (pos.getZ(i) - Z0) / H);
    const base = Float32Array.from(pos.array);
    const tex = canvasTexture(512, 600, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.save(); g.beginPath();
      OUT.forEach(([x, z], i) => { const px = ((x - X0) / W) * w, py = ((Z1 - z) / H) * h; i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.closePath(); g.clip();
      g.fillStyle = '#e8cc92'; g.fillRect(0, 0, w, h);
      // Spruce grain, running roughly along the length of the case.
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let k = -40; k < 90; k++) { g.strokeStyle = `rgba(150,105,55,${0.12 + rnd() * 0.18})`; g.lineWidth = 1 + rnd() * 2.5; g.beginPath(); g.moveTo(k * 9, 0); g.lineTo(k * 9 - 260, h); g.stroke(); }
      g.restore();
    });
    const boardMat = new THREE.MeshStandardMaterial({ map: tex.tex, roughness: 0.75, alphaTest: 0.5, side: THREE.DoubleSide, transparent: true });
    const board = new THREE.Mesh(geo, boardMat); board.castShadow = board.receiveShadow = true; root.add(board);
    // Ribs underneath, across the grain.
    const ribs = new THREE.Group(); root.add(ribs);
    let nRibs = 0;
    for (let k = 0; k < 13; k++) {
      const c = -0.42 - k * 0.11, pts = [];
      for (let x = -0.7; x <= 0.72; x += 0.01) { const z = c + (x + 0.7) * 0.45; if (insideCase(x, z, OUT)) pts.push([x, z]); }
      if (pts.length < 4) continue;
      const a = pts[0], b = pts.at(-1); nRibs++;
      ribs.add(beam([a[0] + 0.02, Yb - 0.02, a[1] + 0.01], [b[0] - 0.02, Yb - 0.02, b[1] - 0.01], 0.012, M.matte(0xd0a868), 6));
    }
    // Bridges, and a spread of strings resting on them.
    const layout = stringLayout();
    const maple = M.matte(0xb9803f);
    const bridge = new THREE.Group(); root.add(bridge);
    const line = (sel, y, r) => { const e = layout.filter(sel).filter((s) => s.i === 0).map((s) => [s.b[0], y, s.b[2] + 0.01]); for (let i = 1; i < e.length; i++) bridge.add(beam(e[i - 1], e[i], r, maple, 6)); };
    line((s) => !s.bass, GR.STR_Y - 0.02, 0.018); line((s) => s.bass, GR.BASS_Y - 0.03, 0.022);
    // Instead of a soundboard: a heavy steel beam along the same line.
    const rigid = new THREE.Group(); root.add(rigid);
    const steel = M.metal(0x7d8594, { roughness: 0.35 });
    const rl = (sel, y) => { const e = layout.filter(sel).filter((s) => s.i === 0).map((s) => [s.b[0], y, s.b[2] + 0.01]); for (let i = 1; i < e.length; i++) rigid.add(beam(e[i - 1], e[i], 0.03, steel, 6)); };
    rl((s) => !s.bass, GR.STR_Y - 0.03); rl((s) => s.bass, GR.BASS_Y - 0.04);
    const strG = new THREE.Group(); root.add(strG);
    const strMats = new Map();
    for (const s of layout) {
      if (s.i !== 0 || (s.n % 3 !== 1 && s.n !== 40 && s.n !== 49 && s.n !== 64 && s.n !== 16)) continue;
      const m = M.metal(s.wound ? 0xd08448 : 0xe2e6ec, { roughness: 0.3, emissive: new THREE.Color(0), emissiveIntensity: 1 });
      strG.add(beam([s.a[0], s.a[1], s.a[2] + 0.12], [s.b[0] + (s.b[0] - s.a[0]) * 0.04, s.b[1], s.b[2] + (s.b[2] - s.a[2]) * 0.04], s.wound ? 0.0028 : 0.0012, m, 6));
      strMats.set(s.n, m);
    }
    // Waves of sound rising off the board.
    const rings = [];
    const cx = (X0 + X1) / 2 - 0.08, cz = (Z0 + Z1) / 2;
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), M.ghost(0x8ef0ff, 0.3)); r.rotation.x = -Math.PI / 2; root.add(r); rings.push(r);
    }

    // Chart: sound level against time, with and without the soundboard.
    const ch = { n: 40, t: -1, board: true };
    const chart = canvasTexture(720, 440, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.84)'; g.fillRect(0, 0, w, h);
      const x0 = 80, y0 = h - 60, cw = w - 110, chh = h - 120, TMAX = 30, DB0 = 20, DB1 = 100;
      const X = (t) => x0 + (t / TMAX) * cw, Y = (db) => y0 - ((clamp(db, DB0, DB1) - DB0) / (DB1 - DB0)) * chh;
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 2; g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)';
      for (let db = 20; db <= 100; db += 20) { g.beginPath(); g.moveTo(x0, Y(db)); g.lineTo(x0 + cw, Y(db)); g.stroke(); g.fillText(db + ' dB', 12, Y(db) + 7); }
      for (let t = 0; t <= TMAX; t += 10) g.fillText(t + ' s', X(t) - 12, y0 + 30);
      const curve = (on, col, dash) => {
        const L0 = levelDb(V) - (on ? 0 : QUIET_DB), tau = tauOf(ch.n) * (on ? 1 : 4);
        g.strokeStyle = col; g.lineWidth = dash ? 3 : 6; g.setLineDash(dash ? [10, 10] : []);
        g.beginPath(); for (let i = 0; i <= 120; i++) { const t = (i / 120) * TMAX, db = L0 - 8.686 * (t / tau); i ? g.lineTo(X(t), Y(db)) : g.moveTo(X(t), Y(db)); } g.stroke(); g.setLineDash([]);
        return { L0, tau };
      };
      curve(!ch.board, 'rgba(255,255,255,.35)', true);
      const c = curve(ch.board, ch.board ? '#8ef0ff' : '#ffb547', false);
      if (ch.t >= 0 && ch.t <= TMAX) { g.fillStyle = '#fff'; g.beginPath(); g.arc(X(ch.t), Y(c.L0 - 8.686 * (ch.t / c.tau)), 10, 0, Math.PI * 2); g.fill(); }
      g.font = 'bold 24px sans-serif'; g.fillStyle = ch.board ? '#8ef0ff' : '#ffb547';
      g.fillText(`${nameOf(ch.n)}, ${ch.board ? 'with soundboard' : 'bare string on steel'}`, 24, 38);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '20px sans-serif'; g.fillText('dashed: the other way', w - 230, 38);
    });
    const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, side: THREE.DoubleSide }));
    cMesh.position.set(4.6, 3.3, -0.6); cMesh.rotation.y = -0.6; cMesh.scale.setScalar(1.25); stage.root.add(cMesh);

    const lBoard = stage.label('Soundboard: spruce, about 9 mm thick', [0.36, Yb + 0.02, -1.25], root, 'hot');
    const lBridge = stage.label('Bridge', [0.3, GR.STR_Y + 0.03, -0.62], root);
    const lRibs = stage.label('Ribs underneath', [-0.3, Yb - 0.06, -1.0], root);
    const lRigid = stage.label('Heavy steel frame instead', [0.3, GR.STR_Y + 0.05, -0.62], root);
    const lAir = stage.label('Sound waves', [cx, Yb + 0.55, cz], root);

    let t = 99, amp = 0, show = 1, n0 = 40, lastS = s0, crownK = 0, clock = 0;
    const api = {
      strike(n) { t = 0; n0 = n; ch.n = n; synth.strike(n, V, { board: lastS?.board ? 1 : 0 }); },
    };
    let base0 = 40;
    const off = keyInput({ onDown: (k) => { const n = base0 + k; if (n > 88) return 0; api.strike(n); return n; }, onOctave: (d) => { base0 = clamp(base0 + 12 * d, 4, 76); } });

    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt); lastS = s; clock += dt;
        synth.sync();
        t += dt;
        show = approach(show, s.board ? 1 : 0, 5, dt);
        board.visible = show > 0.02; bridge.visible = board.visible;
        boardMat.opacity = s.ribs ? 0.35 * show : show; boardMat.alphaTest = s.ribs ? 0.1 : 0.5; boardMat.depthWrite = !s.ribs;
        ribs.visible = show > 0.02; ribs.children.forEach((r) => { r.material.transparent = true; r.material.opacity = show; });
        rigid.visible = show < 0.98;
        rigid.children.forEach((r) => { r.material.transparent = true; r.material.opacity = 1 - show; });
        lBoard.visible = show > 0.5; lBridge.visible = show > 0.5; lRibs.visible = show > 0.5 && s.ribs; lRigid.visible = show <= 0.5;
        // Envelope of the note: amplitude falls as e^(−t/τ); the soundboard shortens τ fourfold.
        const tau = tauOf(n0) * (s.board ? 1 : 4);
        amp = t < 60 ? Math.exp(-t / tau) : 0;
        const loud = amp * (s.board ? 1 : 10 ** (-QUIET_DB / 20));
        // Board: crown (exaggerated if asked) plus a vibration pattern, drawn much slower and far bigger than life.
        crownK = approach(crownK, s.crown ? 30 : 1, 4, dt);
        const f = SCALE[n0].f, m = f < 150 ? 1 : f < 400 ? 2 : 3;
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3], z = base[i * 3 + 2];
          const u = (x - X0) / W, v = (z - Z0) / H;
          const r2 = ((u - 0.45) / 0.55) ** 2 + ((v - 0.55) / 0.6) ** 2;
          const crown = (CROWN_MM / 1000) * crownK * Math.max(0, 1 - r2);
          const vib = loud * 0.03 * Math.sin(Math.PI * u * m) * Math.sin(Math.PI * v * (m + 1)) * Math.sin(clock * 9);
          pos.array[i * 3 + 1] = Yb + crown + vib;
        }
        pos.needsUpdate = true; geo.computeVertexNormals();
        // Strings light up while they ring.
        strMats.forEach((mat, n) => { mat.emissive.set(0x8ef0ff).multiplyScalar(n === n0 ? amp * 0.8 : 0); });
        // Air: rings rise and spread; brightness follows the sound level.
        const lvl = clamp((levelDb(V) - (s.board ? 0 : QUIET_DB) + 20 * Math.log10(Math.max(amp, 1e-6)) - 40) / 50, 0, 1);
        rings.forEach((r, i) => {
          const k = (clock * 0.45 + i / rings.length) % 1;
          r.position.set(cx, Yb + 0.03 + k * 0.6, cz);
          const R = (s.board ? 0.25 + k * 0.6 : 0.05 + k * 0.12);
          r.scale.set(R, R, 1);
          r.material.opacity = lvl * (1 - k) * 0.6;
          r.visible = lvl > 0.01;
        });
        lAir.visible = lvl > 0.05;
        // Chart.
        if (ch.board !== s.board || Math.abs(ch.t - t) > 0.1) { ch.board = s.board; ch.t = t < 30 ? t : -1; chart.redraw(); }
      },
      readout: (s) => compact((() => {
        const sc = SCALE[n0], tau = tauOf(n0) * (s.board ? 1 : 4), L0 = levelDb(V) - (s.board ? 0 : QUIET_DB);
        const now = t < 60 ? L0 - 8.686 * (t / tau) : 0;
        const strA = sc.D * sc.L;
        return `<div class="big">${s.board ? 'Loud, then fades' : 'Quiet, but long'}</div>
          <div class="row"><span>${nameOf(n0)} struck mezzo-forte</span><b>about ${Math.round(L0)} dB at 1 m</b></div>
          <div class="row"><span>Fades by 60 dB in</span><b>about ${Math.round(6.91 * tau)} s</b></div>
          <div class="row"><span>Area pushing the air</span><b>${s.board ? `soundboard ${AREA.toFixed(2)} m²` : `string ${(strA * 1e4).toFixed(1)} cm²`}</b></div>
          <div class="row"><span>Board ÷ string area</span><b>about ${Math.round(AREA / strA).toLocaleString('en')}×</b></div>
          ${t < 30 ? `<div class="row"><span>Level now</span><b>${Math.max(0, Math.round(now))} dB</b></div>` : ''}
          <small>Levels are estimates. The soundboard has ${nRibs} ribs in this model.</small>`;
      })(), stage),
      dispose() { off(); synth.allOff(); },
    };
  },
};
void BASS_BRIDGE_TO; void box;
