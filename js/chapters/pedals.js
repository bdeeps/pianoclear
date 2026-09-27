// Chapter 6: the pedals, and playing soft and loud. One octave of a grand (C4 to C5), with its
// hammers, three strings per note and dampers; the pedal lyre is drawn closer than it really is.
import { THREE, M, box, beam, clamp, approach } from '../kit.js';
import { synth, keyInput, makeKeys, makePlayer, keyX, GR, SCALE, nameOf, contactTime, levelDb, dynamicName, compact } from '../piano.js';

const U = 20;                                      // 1 scene unit = 5 cm
const A = 40, B = 52;                              // C4 … C5
const XC = (keyX[A] + keyX[B]) / 2;
const SPACING = 0.0042;                            // distance between the strings of a unison, m
const R = GR.FLANGE_Z - GR.HAM_Z;                  // hammer shank length, m
// Sympathetic resonance: strings whose overtones match the struck note's (octave, fifth, fourth, major third).
const SYMPATHY = { 12: 0.6, 7: 0.3, 5: 0.18, 4: 0.12, 19: 0.3, 24: 0.25 };

export default {
  id: 'pedals',
  short: 'Pedals and dynamics',
  title: 'Soft, loud, and the three pedals',
  subtitle: 'Hit harder for louder and brighter. The pedals do the rest.',
  view: { pos: [11.0, 8.4, 2.4], target: [-0.2, 3.8, -4.4] },
  learn: `<p>Cristofori called his invention the <b>gravicembalo col piano e forte</b>: a harpsichord that plays soft and loud. On a harpsichord, a quill plucks the string the same way however you press. On a piano, pressing faster throws the hammer faster. A faster hammer makes a <b>louder</b> note, and it's <b>brighter</b> too: the felt squashes harder and touches the string for a shorter time, which brings out the high overtones.</p>
    <p>The <b>right pedal</b> (sustain) lifts <b>every damper</b>. Notes keep ringing after you let go, and the other strings are free to join in: a string whose overtones match the note starts to hum along. This is <b>sympathetic resonance</b>, and it gives the pedalled sound its glow.</p>
    <p>The <b>left pedal</b> (una corda, "one string") slides the whole keyboard and action a few millimetres to the right. Each hammer now hits only two of its three strings, with a softer part of its felt. The <b>middle pedal</b> (sostenuto) is clever: it keeps up only the dampers that were already up when you pressed it, so you can hold a bass note while playing crisp notes above.</p>
    <p class="tip"><b>Try it:</b> play a few notes with A S D F G H J K, with and without the right pedal. Then try the left pedal and watch the hammers slide.</p>`,
  terms: [
    { t: 'Dynamics', d: 'How loud or soft music is played, from pianissimo (pp) to fortissimo (ff).' },
    { t: 'Sustain pedal', d: 'The right pedal. It lifts all the dampers so notes keep ringing.' },
    { t: 'Una corda', d: 'The left pedal. It shifts the hammers so they hit fewer strings with softer felt.' },
    { t: 'Sostenuto', d: 'The middle pedal. It holds up only the dampers of the keys held when it was pressed.' },
    { t: 'Sympathetic resonance', d: 'A string starting to vibrate by itself because another note shares its frequencies.' },
  ],
  defaults: { force: 2.5, sustain: false, soft: false, sost: false },
  controls: [
    { key: 'force', type: 'range', label: 'How hard you play', min: 0.5, max: 6, step: 0.1, ends: ['pp', 'ff'], fmt: (v) => `${dynamicName(v)}, hammer ${v.toFixed(1)} m/s` },
    { key: 'sustain', type: 'toggle', label: 'Right pedal: sustain' },
    { key: 'sost', type: 'toggle', label: 'Middle pedal: sostenuto' },
    { key: 'soft', type: 'toggle', label: 'Left pedal: una corda' },
    { key: 'play', type: 'buttons', label: 'Play', items: [
      { label: '♪ C–E–G', act: (s, inst) => inst.seq([[0, 40, 0.5], [0.25, 44, 0.5], [0.5, 47, 0.8]]) },
      { label: '♪ A run', act: (s, inst) => inst.seq([40, 42, 44, 45, 47, 49, 51, 52].map((n, i) => [i * 0.16, n, 0.12])) },
      { label: '♪ Sostenuto trick', act: (s, inst) => inst.sostDemo() },
    ] },
  ],
  quiz: [
    { q: 'What does the right (sustain) pedal do?', options: ['Makes every note louder', 'Lifts all the dampers so the strings keep ringing', 'Shifts the hammers sideways', 'Locks the keys down'], answer: 1, why: 'With every damper up, notes ring on after you let go, and other strings can resonate in sympathy.' },
    { q: 'Why does a note played harder sound brighter as well as louder?', options: ['The string gets tighter', 'The hammer felt squashes harder and touches for a shorter time, bringing out high overtones', 'More strings are struck', 'The soundboard moves closer'], answer: 1, why: 'A shorter, harder blow puts more energy into the high overtones. Felt gets stiffer the more it is squashed.' },
    { q: 'On a grand, how does the left (una corda) pedal make notes softer?', options: ['It puts felt between the hammers and strings', 'It slides the action so each hammer hits fewer strings with a softer part of its felt', 'It slows the keys down', 'It lowers the lid'], answer: 1, why: 'Una corda means "one string". Modern grands shift so the hammer strikes two of the three strings.' },
  ],
  reel: [
    { ms: 5600, caption: 'The right pedal lifts every damper, so the notes ring on and other strings hum along.', set: { force: 2.5, sustain: true, soft: false, sost: false }, act: (s, inst) => inst.seq([[0, 40, 0.3], [0.35, 44, 0.3], [0.7, 47, 0.3], [1.05, 52, 0.3]]), view: { pos: [8.4, 6.8, -0.4], target: [0, 4.2, -5.6] }, spin: 0.15 },
    { ms: 5200, caption: 'Press harder and the hammer flies faster: louder and brighter. Piano e forte.', set: { sustain: false, soft: false, sost: false }, anim: { force: [0.6, 6] }, act: (s, inst) => inst.seq([[0, 40, 0.3], [0.8, 44, 0.3], [1.6, 47, 0.3], [2.4, 52, 0.3], [3.2, 47, 0.3], [4.0, 40, 0.4]]), view: { pos: [7.2, 7.8, -2.6], target: [0, 4.8, -7.2] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.scale.setScalar(U); root.position.set(0, 3 - GR.KEY_Y * U, 1.2 - GR.KEY_Z * U * 0.4); stage.root.add(root);
    root.position.z = -1.8;
    const oct = new THREE.Group(); oct.position.x = -XC; root.add(oct);        // everything in the grand's coordinates
    const wood = M.matte(0xd9b27a), felt = M.matte(0xf3efe6), dark = M.matte(0xc79a62), brass = M.metal(0xd9b25a, { roughness: 0.3 });
    const lacquer = M.plastic(0x16181e, { roughness: 0.3 });

    // Keybed and a slice of the case.
    const bed = box(0.24, 0.012, 0.46, lacquer); bed.position.set(XC, GR.KEY_Y - 0.05, -0.07); oct.add(bed);
    const belly = box(0.3, 0.14, 0.03, lacquer); belly.position.set(XC, GR.BOARD_Y - 0.07, GR.BELLY_Z - 0.015); oct.add(belly);
    const sb = box(0.3, 0.008, 0.36, M.matte(0xe8cc92)); sb.position.set(XC, GR.BOARD_Y - 0.004, GR.BELLY_Z - 0.18); oct.add(sb);

    // The shifting part: keys and hammers.
    const action = new THREE.Group(); oct.add(action);
    const kb = makeKeys(A, B); kb.group.position.set(0, GR.KEY_Y, GR.KEY_Z); action.add(kb.group);
    stage.pickables.push(...kb.pickables);
    const flangeRail = box(0.3, 0.015, 0.02, wood); flangeRail.position.set(XC, GR.FLANGE_Y + 0.02, GR.FLANGE_Z); action.add(flangeRail);
    const hammers = [];
    for (let n = A; n <= B; n++) {
      const g = new THREE.Group(); g.position.set(keyX[n], GR.FLANGE_Y, GR.FLANGE_Z); action.add(g);
      const top = GR.STR_Y - GR.BLOW - 0.001 - GR.FLANGE_Y;
      const shank = box(0.004, 0.005, R, M.matte(0xd8b884)); shank.position.set(0, 0, -R / 2); g.add(shank);
      const core = box(0.009, top * 0.45, 0.02, dark); core.position.set(0, top * 0.22, -R); g.add(core);
      const head = box(0.011, top * 0.56, 0.03, felt); head.position.set(0, top * 0.72, -R); g.add(head);
      hammers[n] = g;
    }
    // Strings: three per note, from the agraffe back over the soundboard.
    const strMat = [];
    const strings = new THREE.Group(); oct.add(strings);
    for (let n = A; n <= B; n++) {
      const m = M.metal(0xe2e6ec, { roughness: 0.25, emissive: new THREE.Color(0), emissiveIntensity: 1 });
      strMat[n] = [m, m.clone(), m.clone()];
      for (let i = 0; i < 3; i++) {
        const x = keyX[n] + (i - 1) * SPACING;
        strings.add(beam([x, GR.STR_Y, -0.1], [x, GR.STR_Y, -0.5], 0.0006, strMat[n][i], 6));
      }
    }
    const agraffe = box(0.3, 0.02, 0.02, M.metal(0xc7a14c, { roughness: 0.4 })); agraffe.position.set(XC, GR.STR_Y + 0.01, -0.1); oct.add(agraffe);
    // Dampers: felt on the strings, wire down to an underlever behind the keys; the sustain pedal
    // raises a rail (the damper tray) under all the levers; the sostenuto rod can catch a raised damper.
    const dampers = [];
    const ulY = GR.KEY_Y - 0.03;
    for (let n = A; n <= B; n++) {
      const g = new THREE.Group(); g.position.set(keyX[n], 0, 0); oct.add(g);
      const f = box(0.011, 0.012, 0.024, M.matte(0x30333c)); f.position.set(0, GR.STR_Y + 0.008, GR.DAMP_Z); g.add(f);
      const h = box(0.011, 0.024, 0.02, M.matte(0xb88a55)); h.position.set(0, GR.STR_Y + 0.026, GR.DAMP_Z); g.add(h);
      const w = beam([0, ulY + 0.005, GR.DAMP_Z], [0, GR.STR_Y + 0.02, GR.DAMP_Z], 0.001, M.metal(0xc9ced6), 5); g.add(w);
      const tab = box(0.006, 0.004, 0.008, brass); tab.position.set(0, GR.STR_Y - 0.035, GR.DAMP_Z + 0.006); g.add(tab);
      const lev = box(0.009, 0.008, 0.09, wood); lev.position.set(0, ulY, GR.DAMP_Z - 0.02); g.add(lev);
      dampers[n] = g;
    }
    const tray = box(0.3, 0.008, 0.03, M.matte(0x6b4a2e)); tray.position.set(XC, ulY - 0.012, GR.DAMP_Z - 0.03); oct.add(tray);
    const sostRod = new THREE.Group(); sostRod.position.set(XC, GR.STR_Y - 0.042, GR.DAMP_Z + 0.014); oct.add(sostRod);
    const rod = box(0.3, 0.004, 0.004, brass); sostRod.add(rod);
    const lip = box(0.3, 0.002, 0.008, brass); lip.position.set(0, 0, 0.004); sostRod.add(lip);

    // Pedal lyre (drawn much closer to the keys than it really is), and the rods going up.
    const lyre = new THREE.Group(); lyre.position.set(XC, GR.KEY_Y - 0.13, 0.14); oct.add(lyre);
    const pbox = box(0.16, 0.03, 0.05, lacquer); lyre.add(pbox);
    const pedals = [-0.055, 0, 0.055].map((x) => { const p = new THREE.Group(); p.position.set(x, -0.01, 0.03); lyre.add(p); const b = box(0.022, 0.008, 0.07, brass); b.position.z = 0.035; p.add(b); return p; });
    for (const x of [-0.055, 0, 0.055]) lyre.add(beam([x, 0.02, -0.03], [x, 0.06, -0.12], 0.003, M.metal(0x9aa3b2), 6));

    const L = (t, parent, pos, cls) => stage.label(t, pos, parent, cls);
    const lab = {
      damp: L('Dampers', oct, [keyX[A] - 0.03, GR.STR_Y + 0.05, GR.DAMP_Z]),
      ham: L('Hammers', action, [keyX[A] - 0.035, GR.STR_Y - 0.03, GR.HAM_Z], 'hot'),
      str: L('3 strings per note', oct, [keyX[B] + 0.02, GR.STR_Y + 0.01, -0.44]),
      tray: L('Damper lift rail', oct, [keyX[B] + 0.03, ulY - 0.01, GR.DAMP_Z - 0.03]),
      sost: L('Sostenuto rod', oct, [keyX[B] + 0.05, GR.STR_Y - 0.045, GR.DAMP_Z + 0.014]),
      ped: L('Pedals: left, middle, right (drawn closer)', lyre, [0.13, 0, 0.05]),
    };
    const minor = [lab.tray, lab.sost, lab.str];

    // Model state, shaped like the big piano's so the shared player can drive it.
    const st = { key: new Float32Array(89), ham: new Float32Array(89), damp: new Float32Array(89), glow: new Float32Array(89) };
    const model = { state: st, setKey: (n, v) => { st.key[n] = v; }, setHammer: (n, v) => { st.ham[n] = v; }, setDamper: (n, v) => { st.damp[n] = v; }, glow: (n, v) => { st.glow[n] = Math.max(st.glow[n], v); } };
    let S = null, last = null, autoSost = 0, sostSet = new Set(), sostWas = false;
    const symp = new Float32Array(89);
    const player = makePlayer(model, {
      slow: 4,
      onStrike: (n, v) => {
        const soft = S?.soft;
        last = { n, v };
        synth.strike(n, v * (soft ? 0.8 : 1), { strings: soft ? 2 : 3, soft: soft ? 0.5 : 0, wetness: S?.sustain ? 0.4 : 0.12 });
        // With the dampers up, related strings pick up the vibration.
        for (let m = A; m <= B; m++) {
          const k = SYMPATHY[Math.abs(m - n)];
          if (!k || m === n || st.damp[m] < 0.5) continue;
          symp[m] = Math.max(symp[m], k * (v / 3));
          if (k >= 0.3) synth.strike(m, 0.25 * v * k, { wetness: 0.5 });
        }
      },
    });
    const queue = [];
    let clock = 0;
    const api = {
      seq(list) {
        queue.length = 0;
        list.forEach((it) => { const [t, n, hold] = Array.isArray(it) ? it : [0, it, 0.2]; queue.push({ at: clock + t, n, down: true }); queue.push({ at: clock + t + hold, n, down: false }); });
        queue.sort((a, b) => a.at - b.at);
      },
      sostDemo() {
        queue.length = 0;
        const q = (at, n, down) => queue.push({ at: clock + at, n, down });
        q(0, 40, true); q(0.02, 44, true); q(0.04, 47, true);
        queue.push({ at: clock + 0.6, sost: true });
        q(0.9, 40, false); q(0.9, 44, false); q(0.9, 47, false);
        [49, 51, 52, 51, 49].forEach((n, i) => { q(1.3 + i * 0.3, n, true); q(1.3 + i * 0.3 + 0.12, n, false); });
        queue.push({ at: clock + 3.6, sost: false });
        queue.sort((a, b) => a.at - b.at);
      },
    };
    const held = new Set();
    const off = keyInput({ onDown: (k) => { const n = A + k; if (n > B) return 0; held.add(n); player.press(n, S?.force ?? 2.5); return n; }, onUp: (n) => { held.delete(n); player.lift(n); } });
    const damped = new Uint8Array(89).fill(1);

    return {
      ...api,
      pick(o) { const n = o.userData.key; if (!n) return; player.press(n, S.force); queue.push({ at: clock + 0.5, n, down: false }); queue.sort((a, b) => a.at - b.at); },
      update(dt, s) {
        dt = Math.max(0, dt); S = s; clock += dt;
        synth.sync();
        while (queue.length && queue[0].at <= clock) {
          const q = queue.shift();
          if (q.sost !== undefined) { autoSost = q.sost ? 1 : 0; continue; }
          if (q.down) player.press(q.n, s.force); else if (!held.has(q.n)) player.lift(q.n);
        }
        // Sostenuto: remember which dampers were up (because their keys were down) when it went down.
        const sost = s.sost || autoSost > 0;
        if (sost && !sostWas) { sostSet = new Set(); for (let n = A; n <= B; n++) if (st.key[n] > 0.5) sostSet.add(n); }
        if (!sost) sostSet.clear();
        sostWas = sost;
        player.update(dt, { sustain: s.sustain, held: (n) => sostSet.has(n) });
        // Una corda: the keyboard and action slide one string-spacing to the right.
        action.position.x = approach(action.position.x, s.soft ? SPACING : 0, 10, dt);
        for (let n = A; n <= B; n++) {
          kb.keys[n].set(st.key[n]);
          hammers[n].rotation.x = Math.asin(clamp((GR.BLOW * st.ham[n]) / R, -1, 1));
          dampers[n].position.y = st.damp[n] * 0.01;
          // Dampers landing stop the sound.
          const down = st.damp[n] < 0.1;
          if (down && !damped[n]) synth.damp(n);
          damped[n] = down ? 1 : 0;
          // Glow: struck strings light up (two of three with una corda); sympathetic ones hum faintly.
          symp[n] *= Math.exp(-dt * (st.damp[n] > 0.5 ? 0.5 : 6));
          st.glow[n] *= Math.exp(-dt * (st.damp[n] > 0.5 ? 0.5 : 5));
          const g = st.glow[n];
          strMat[n].forEach((m, i) => { const hit = !(s.soft && i === 0); m.emissive.set(hit ? 0x8ef0ff : 0x000000).multiplyScalar(Math.min(1, hit ? g : 0) * 0.9); m.emissive.add(new THREE.Color(0xffb547).multiplyScalar(Math.min(0.8, symp[n]))); });
        }
        tray.position.y = ulY - 0.012 + (s.sustain ? 0.01 : 0);
        sostRod.rotation.x = sost ? 0.6 : 0;
        pedals[0].rotation.x = s.soft ? 0.18 : 0; pedals[1].rotation.x = sost ? 0.18 : 0; pedals[2].rotation.x = s.sustain ? 0.18 : 0;
        const narrow = stage.host.clientWidth < 560;
        minor.forEach((l) => { l.visible = !narrow; });
      },
      readout: (s) => compact((() => {
        const v = last?.v ?? s.force, n = last?.n ?? 40;
        const tc = contactTime(n, v) * (s.soft ? 1.5 : 1);
        const bright = 1 / (tc * 1.4);                      // where the felt has halved the overtones, Hz
        const ped = [s.sustain && 'sustain', (s.sost || autoSost) && 'sostenuto', s.soft && 'una corda'].filter(Boolean);
        return `<div class="big">${dynamicName(v)}: ${Math.round(levelDb(v) - (s.soft ? 2 : 0))} dB</div>
          <div class="row"><span>Hammer speed</span><b>${v.toFixed(1)} m/s</b></div>
          <div class="row"><span>Felt touches the string for</span><b>${(tc * 1000).toFixed(1)} ms</b></div>
          <div class="row"><span>Strong overtones up to about</span><b>${Math.round(bright / 10) * 10} Hz (${Math.max(1, Math.floor(bright / SCALE[n].f))} of them on ${nameOf(n)})</b></div>
          <div class="row"><span>Strings struck</span><b>${s.soft ? '2 of 3 (una corda)' : '3 of 3'}</b></div>
          <div class="row"><span>Pedals down</span><b>${ped.length ? ped.join(', ') : 'none'}</b></div>`;
      })(), stage),
      dispose() { off(); synth.allOff(); },
    };
  },
};
