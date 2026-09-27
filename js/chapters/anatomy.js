// Chapter 1: take a grand piano apart.
import { THREE, exploder } from '../kit.js';
import { makeGrand, makePlayer, synth, keyInput, nameOf, SCALE, TOTAL_STRINGS, TOTAL_TENSION, G, DAMPED_TO, compact } from '../piano.js';

const S = 4;                     // 1 scene unit = 25 cm
const T_TONNES = TOTAL_TENSION / G / 1000;

export default {
  id: 'anatomy',
  short: 'Inside a piano',
  title: 'Inside a grand piano',
  subtitle: 'Keys, hammers, dampers, strings, an iron frame and a big wooden board.',
  view: { pos: [5.4, 7.6, 8.4], target: [-1.3, 2.6, -2.4] },
  learn: `<p>A piano is a <b>string instrument</b> that you play with <b>hammers</b>. Under the lid are about 230 steel <b>strings</b>. Each of the <b>88 keys</b> (52 white, 36 black) is a lever that throws a felt hammer up at its strings.</p>
    <p>A felt <b>damper</b> rests on top of each note's strings to keep them quiet. Press a key and its damper lifts, so the string can ring. Let go and the damper drops back.</p>
    <p>Each string pulls with the weight of a grown-up, about 80 kg. All together that is close to <b>20 tonnes</b>, so the strings are stretched across a heavy <b>cast-iron plate</b>. Under the strings is the <b>soundboard</b>, a thin sheet of spruce that turns their shaking into sound. The longest bass strings are wrapped in copper and cross over the others. The <b>pedals</b> at your feet move the dampers and the hammers.</p>
    <p class="tip"><b>Try it:</b> take the piano apart, then click any key (or press A S D F on your keyboard) and watch the hammer, the damper and the strings.</p>`,
  terms: [
    { t: 'Action', d: 'The set of levers between each key and its hammer and damper. A grand has 88 of them.' },
    { t: 'Damper', d: 'A felt pad that rests on a note’s strings to stop them ringing.' },
    { t: 'Cast-iron plate', d: 'The heavy golden frame that holds the pull of all the strings, close to 20 tonnes.' },
    { t: 'Soundboard', d: 'A thin, wide board of spruce under the strings that turns their vibration into sound.' },
    { t: 'Bridge', d: 'A long strip of hard wood glued to the soundboard. The strings press on it and pass their shaking into the board.' },
  ],
  defaults: { explode: 0, xray: false, lid: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'See-through case' },
    { key: 'lid', type: 'toggle', label: 'Lid open' },
    { key: 'play', type: 'buttons', label: 'Play', items: [{ label: '♪ Middle C', act: (s, inst) => inst.play([40]) }, { label: '♪ A chord', act: (s, inst) => inst.play([28, 40, 44, 47]) }, { label: '♪ Lowest and highest', act: (s, inst) => inst.play([1, 88]) }] },
  ],
  quiz: [
    { q: 'What makes a piano string sound when you press a key?', options: ['A tiny plectrum plucks it', 'A felt hammer hits it', 'A bow rubs it', 'An electric pickup buzzes it'], answer: 1, why: 'The key is a lever that throws a felt-covered hammer at the string. That is why a piano counts as a string instrument and a percussion instrument.' },
    { q: 'What is the damper for?', options: ['It makes the note louder', 'It rests on the strings to stop them ringing when you let go', 'It tunes the string', 'It holds the key up'], answer: 1, why: 'The damper lifts when you press the key and drops back when you let go, which silences the string.' },
    { q: 'Why does a modern piano need a cast-iron plate?', options: ['To make it heavy so it doesn’t slide', 'To hold the pull of all the strings, close to 20 tonnes', 'To make the sound brighter', 'To stop the keys wobbling'], answer: 1, why: 'Around 230 strings each pull with about 80 kg. A wooden frame alone would slowly bend and the piano would go out of tune.' },
  ],
  reel: [
    { ms: 6200, caption: 'A grand piano is 88 keys, 88 hammers, about 230 strings and a big wooden soundboard.', set: { xray: false, lid: true }, anim: { explode: [0, 1] }, view: { pos: [5.6, 6.0, 5.6], target: [0, 3.4, -2.6] }, spin: 0.5 },
    { ms: 5200, caption: 'Its strings pull with nearly 20 tonnes, so a cast-iron plate holds them tight.', set: { explode: 0, xray: true, lid: false }, act: (s, inst) => inst.play([28, 40, 44, 47], true), view: { pos: [2.2, 8.0, 2.6], target: [0, 3.2, -2.8] }, spin: 0.25 },
  ],

  build({ stage }) {
    last = 0; damped.length = 0;
    const p = makeGrand();
    const root = new THREE.Group(); root.scale.setScalar(S); root.position.z = 1.6; stage.root.add(root);
    root.add(p.group);
    const player = makePlayer(p, { slow: 5, onStrike: (n, v) => synth.strike(n, v) });
    stage.pickables.push(...p.pickables);

    const setExplode = exploder([
      { obj: p.lidHinge, off: [0, 0.95, 0] },
      { obj: p.plateG, off: [0, 0.62, 0] },
      { obj: p.dampG, off: [0, 0.42, 0] },
      { obj: p.strG, off: [0, 0.26, 0] },
      { obj: p.boardG, off: [0, 0.08, 0] },
      { obj: p.actionG, off: [0, 0, 0.5] },
      { obj: p.lyre, off: [0, -0.02, 0.62] },
    ]);
    const L = (t, obj, pos, cls) => stage.label(t, pos, obj, cls);
    const labels = [
      L('Keys: 52 white, 36 black', p.actionG, [0.35, 0.74, 0.28]),
      L('Hammers', p.actionG, [0.66, 0.83, -0.3], 'hot'),
      L('Dampers', p.dampG, [-0.72, 0.92, -0.3]),
      L('Strings', p.strG, [0.02, 0.86, -0.75], 'hot'),
      L('Cast-iron plate', p.plateG, [-0.2, 0.9, -1.55]),
      L('Soundboard', p.boardG, [0.18, 0.8, -1.5]),
      L('Pedals', p.lyre, [0.22, 0.1, 0.12]),
      L('Lid', p.lidHinge, [0.9, 0.05, -1.2]),
    ];
    const minor = [labels[5], labels[7]];
    let lidA = 0.62, glowHold = 0, base = 40;
    const held = new Set(), pending = [];
    // Buttons and clicks press keys and let go a moment later (counted in frames, so videos come out the same).
    const tap = (ns, hold) => { ns.forEach((n, i) => { player.press(n, 2 + i * 0.3); last = n; }); pending.push({ ns, t: hold }); };
    const off = keyInput({
      onDown: (k) => { const n = base + k; if (n > 88) return 0; held.add(n); player.press(n, 2.4); last = n; return n; },
      onUp: (n) => { held.delete(n); player.lift(n); },
      onOctave: (d) => { base = Math.max(4, Math.min(76, base + 12 * d)); },
    });
    return {
      play(ns, auto = false) { tap(ns, 1.6); if (auto) glowHold = 2.5; },
      pick(o) { const n = o.userData.key; if (n) tap([n], 1.2); },
      update(dt, s) {
        dt = Math.max(0, dt);
        synth.sync();
        setExplode(s.explode);
        const narrow = stage.host.clientWidth < 560;
        minor.forEach((l) => { l.visible = !narrow; });
        lidA += ((s.lid && s.explode < 0.5 ? 0.62 : 0) - lidA) * Math.min(1, dt * 4);
        p.setLid(lidA);
        p.setXray(s.xray || s.explode > 0.05);
        for (const q of pending) { q.t -= dt; if (q.t <= 0) q.ns.forEach((n) => { if (!held.has(n)) { player.lift(n); } }); }
        for (let i = pending.length - 1; i >= 0; i--) if (pending[i].t <= 0) pending.splice(i, 1);
        player.update(dt);
        // When a damper lands again, the sound stops.
        for (let n = 1; n <= DAMPED_TO; n++) { if (damped[n] === false && p.state.damp[n] < 0.1) synth.damp(n); damped[n] = p.state.damp[n] < 0.1 ? true : false; }
        p.update(dt, glowHold > 0 ? 0.3 : 1.2);
        glowHold -= dt;
      },
      readout: (s) => compact((() => {
        const n = last, sc = n && SCALE[n];
        return `<div class="big">${TOTAL_STRINGS} strings, ${T_TONNES.toFixed(1)} tonnes of pull</div>
          <div class="row"><span>Keys</span><b>88: 52 white, 36 black</b></div>
          <div class="row"><span>Strings per note</span><b>1, 2 or 3</b></div>
          <div class="row"><span>Average pull per string</span><b>${Math.round(TOTAL_TENSION / G / TOTAL_STRINGS)} kg</b></div>
          ${sc ? `<div class="row"><span>Last note: ${nameOf(n)}</span><b>${sc.f.toFixed(1)} Hz, ${sc.strings} string${sc.strings > 1 ? 's' : ''}, ${Math.round(sc.L * 100)} cm long</b></div>` : '<small>Click a key to play it.</small>'}`;
      })(), stage),
      dispose() { off(); synth.allOff(); },
    };
  },
};
let last = 0;
const damped = [];
