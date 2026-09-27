// Chapter 2: one key's grand action, from the side. Key → wippen → jack → hammer, with
// escapement (let-off), the backcheck, the repetition lever (Érard, 1821) and the damper.
// Built in millimetres: x runs from the front of the key (0) towards the back of the piano,
// y is up from the top of the key. The geometry is solved every frame, so every part is
// pushed by the part below it. Dimensions follow a modern grand action: 10 mm key dip,
// about 45 mm hammer blow, overall ratio about 5 : 1, let-off about 2 mm from the string.
import { THREE, M, box, clamp, approach } from '../kit.js';
import { synth, compact } from '../piano.js';

const MM = 0.02;                                    // 1 scene unit = 50 mm
const PK = [235, -22];                              // key balance point
const PW = [282, 44];                               // wippen flange (pivot)
const PH = [355, 92];                               // hammer flange (pivot)
const PR = [328, 66];                               // repetition lever pivot, on the wippen
const CAP = [335, 12];                              // top of the capstan, on the key
const JACK = [369, 38], JACK_TOP = 43, TOE = [-13, 6];   // jack pivot (on the wippen), its length and its toe
const KNUCKLE = [369, 81];                          // bottom of the knuckle when the hammer rests
const CROWN = [473, 140];                           // top of the hammer felt at rest
const TAIL = [484, 120];                            // tail at the back of the hammer head (caught by the backcheck)
const DIP = 10;                                     // key dip at the front, mm
const G_ANG = 9.81 / 0.118;                         // hammer falling under gravity: ≈ g / (distance to the head), rad/s²
const NOTE = 40;                                    // the note we hear: middle C

const rot = ([x, y], [px, py], a) => { const c = Math.cos(a), s = Math.sin(a); return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
const solve = (f, target, lo, hi) => { for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; };

// Kinematics: key dip d (mm) → key angle, wippen angle, where the jack top is, and the hammer angle
// that puts the knuckle on the jack.
const keyA = (d) => Math.asin(d / (PK[0]));
const capY = (d) => rot(CAP, PK, keyA(d))[1];
const heelY = (a) => rot([CAP[0], CAP[1]], PW, a)[1];
const wipA = (d) => solve(heelY, capY(d), -0.05, 0.3);
const jackPivot = (d) => rot(JACK, PW, wipA(d));
const knuckleY = (phi) => rot(KNUCKLE, PH, phi)[1];
const crownY = (phi) => rot(CROWN, PH, phi)[1];
const hamA = (jy) => solve(knuckleY, jy, -0.1, 0.9);
const jackTopY = (d, psi = 0) => { const p = jackPivot(d), a = wipA(d) + psi; return p[1] + JACK_TOP * Math.cos(a); };
const phiK = (d) => hamA(jackTopY(d));
// The string sits where the hammer would reach at 9.6 mm of dip if the jack never let go.
const STRING_Y = crownY(phiK(9.6));
const D_LET = solve((d) => crownY(phiK(d)), STRING_Y - 2, 0, DIP);          // let-off: 2 mm below the string
const PHI_S = solve(crownY, STRING_Y, 0, 0.9);                                // hammer angle touching the string
const PHI_C = solve(crownY, STRING_Y - 16, 0, 0.9);                             // checked: 16 mm below the string
const toeY = (d, psi) => { const p = jackPivot(d), a = wipA(d) + psi; return p[1] + TOE[0] * Math.sin(a) + TOE[1] * Math.cos(a); };
// Let-off button: touches the toe exactly at let-off.
const BUTTON_Y = toeY(D_LET, 0);
const jackPsi = (d) => (d <= D_LET ? 0 : solve((psi) => -toeY(d, psi), -BUTTON_Y, 0, 0.6));   // the button forces the toe down
// Repetition lever: its tip (under the knuckle) can rise at most REP_LIFT above rest, and never above the drop screw.
const REP_TIP = [369, 79], REP_LIFT = 0.07;
const repTipY = (d, lam) => { const pr = rot(PR, PW, wipA(d)); return rot(rot(REP_TIP, PW, wipA(d)), pr, lam)[1]; };
const DROP_Y = knuckleY(solve(crownY, STRING_Y - 9, 0, 0.9));                // drop screw stops the lever here
// Near the top of the key's travel the hammer's weight wins and it sits on the jack again.
const holdY = (d) => Math.min(repTipY(d, REP_LIFT * clamp((d - 1.5) / 3, 0, 1)), DROP_Y);
const phiHold = (d) => hamA(holdY(d));

export default {
  id: 'action',
  short: 'The action',
  title: 'From key to hammer',
  subtitle: 'A chain of levers throws the hammer, then lets it go.',
  view: { pos: [0.2, 4.6, 11.8], target: [-0.3, 3.0, 0] },
  learn: `<p>Each key is a <b>lever</b> on a pivot, the <b>balance rail</b>. Press the front down 10 mm and the back rises. A little post on the key, the <b>capstan</b>, lifts the <b>wippen</b>, which carries the <b>jack</b>. The jack pushes the hammer shank up by its <b>knuckle</b>, and the felt <b>hammer</b> swings up about 45 mm towards the string. All together the levers turn 1 mm of key into about 5 mm of hammer.</p>
    <p>If the hammer stayed pushed against the string, it would stop it ringing. So just before it gets there, the jack's toe hits the <b>let-off button</b> and the jack tips out from under the knuckle. The hammer <b>flies free</b> for the last 2 mm, hits, and bounces straight back. This trick is called <b>escapement</b>.</p>
    <p>On the way down, the <b>backcheck</b> catches the hammer so it can't bounce up again. Then the <b>repetition lever</b>, invented by Sébastien Érard in 1821, holds the hammer up while the jack slips back underneath. You can play the note again after letting the key rise only halfway. Meanwhile the back of the key has lifted the <b>damper</b> off the string, and it drops back when you let go.</p>
    <p class="tip"><b>Try it:</b> press <i>Strike</i> in slow motion and watch the jack slip out. Then try <i>Quick repeat</i>.</p>`,
  terms: [
    { t: 'Wippen', d: 'The lever that the key lifts. It carries the jack and the repetition lever.' },
    { t: 'Jack', d: 'The upright part that pushes the hammer up, then tips out of the way.' },
    { t: 'Escapement', d: 'The hammer being let go just before it reaches the string, so it hits and bounces away freely.' },
    { t: 'Backcheck', d: 'A felt-covered block on the back of the key that catches the falling hammer.' },
    { t: 'Repetition lever', d: 'A spring-loaded lever that holds the hammer up so the jack can reset quickly: Érard’s double escapement.' },
  ],
  defaults: { speed: 2.5, slow: 0.02 },
  controls: [
    { key: 'speed', type: 'range', label: 'How hard you press', min: 0.5, max: 6, step: 0.1, ends: ['pianissimo', 'fortissimo'], fmt: (v) => `hammer ${v.toFixed(1)} m/s` },
    { key: 'slow', type: 'seg', label: 'Slow motion', options: [{ v: 1, label: 'Real speed' }, { v: 0.1, label: '10× slower' }, { v: 0.02, label: '50× slower' }] },
    { key: 'go', type: 'buttons', label: 'Play the key', items: [
      { label: '▶ Strike', act: (s, inst) => inst.tap() },
      { label: 'Hold down', act: (s, inst) => inst.hold() },
      { label: 'Let go', act: (s, inst) => inst.release() },
      { label: '⟳ Quick repeat', act: (s, inst) => inst.repeat() },
    ] },
  ],
  quiz: [
    { q: 'Why does the jack slip out from under the hammer just before it hits the string?', options: ['To save energy', 'So the hammer can bounce off and let the string ring', 'To make the key lighter', 'To tune the string'], answer: 1, why: 'A hammer still pushed against the string would mute it at once. Letting it fly free for the last 2 mm means it hits and rebounds.' },
    { q: 'What did Érard’s repetition lever (1821) make possible?', options: ['Louder notes', 'Playing the same note again quickly, before the key has fully risen', 'Keys that never need tuning', 'Playing two notes with one key'], answer: 1, why: 'It holds the hammer up so the jack can reset while the key is only halfway up, so a pianist can repeat a note very fast.' },
    { q: 'You press the front of a key down 10 mm. About how far does the hammer head travel?', options: ['About 2 mm', 'About 10 mm', 'About 45–50 mm', 'About 200 mm'], answer: 2, why: 'The key, wippen and hammer shank are three levers that together multiply the movement about five times.' },
  ],
  reel: [
    { ms: 6000, caption: 'Press a key and a chain of levers flings a felt hammer up at the string.', set: { speed: 2.5, slow: 0.02 }, act: (s, inst) => inst.tap(0.25), view: { pos: [1.4, 3.6, 9.4], target: [1.4, 3.0, 0] }, spin: 0 },
    { ms: 5600, caption: 'Just before it hits, the jack slips away, so the hammer flies free and bounces off.', set: { speed: 3, slow: 0.015 }, act: (s, inst) => inst.tap(0.1), view: { pos: [2.8, 4.6, 5.4], target: [2.6, 3.9, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.scale.setScalar(MM); root.position.set(-6.4, 1.3, 0); stage.root.add(root);
    const Z = 0;                                            // everything sits in one plane, 12 mm deep
    const part = (w, h, d, mat, x, y, parent = root, z = Z) => { const m = box(w, h, d, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const pivotGroup = (p, parent = root) => { const g = new THREE.Group(); g.position.set(p[0], p[1], 0); parent.add(g); return g; };
    const pin = (p, parent = root, x0 = 0, y0 = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 22, 16), M.metal(0xdfe4ec)); m.rotation.x = Math.PI / 2; m.position.set(p[0] - x0, p[1] - y0, 0); parent.add(m); return m; };
    const wood = M.matte(0xd9b27a), dark = M.matte(0x8a5a32), felt = M.matte(0xf1ece2), feltR = M.matte(0xb8453a), feltG = M.matte(0x3f7a52), brass = M.metal(0xd9b25a, { roughness: 0.3 }), rail = M.matte(0x6b4a2e);
    const hot = M.glow(0x8ef0ff);

    // Frame: keybed, balance rail, back rail, key frame.
    part(700, 10, 60, M.matte(0x3a2a1e), 330, -70);
    part(30, 38, 40, rail, PK[0], -41);
    part(40, 14, 40, rail, 505, -53); part(40, 4, 34, feltG, 505, -44);
    part(20, 30, 40, rail, 20, -45); part(16, 4, 34, feltR, 20, -29);
    pin(PK);

    // The key: a lever about the balance point.
    const keyG = pivotGroup(PK), kx = -PK[0], ky = -PK[1];
    part(520, 22, 22, wood, 260 + kx, -11 + ky, keyG);
    part(150, 22.4, 23, M.plastic(0xf4f1ea, { roughness: 0.3 }), 75 + kx, -11 + ky, keyG);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 12, 16), brass); cap.position.set(CAP[0] + kx, 6 + ky, 0); keyG.add(cap);
    // Backcheck: a post on the key end with a felt face angled towards the hammer.
    const bc = new THREE.Group(); keyG.add(bc);
    // Place it so its face meets the hammer's tail when checked with the key fully down.
    const tailC = rot(TAIL, PH, PHI_C), keyFull = keyA(DIP);
    const tailInKey = rot(tailC, PK, -keyFull);
    const bcTop = tailInKey[1] - 7;
    const bcPost = part(5, bcTop - 14, 8, M.metal(0xc9ced6), tailInKey[0] + 9 + kx, (bcTop - 14) / 2 + ky, bc);
    part(12, 16, 16, feltG, tailInKey[0] + 8 + kx, bcTop - 8 + ky, bc);
    void bcPost;

    // Wippen: flange on a rail, heel on the capstan, jack and repetition lever on top.
    part(24, 22, 40, rail, PW[0] - 6, PW[1] + 16);
    const wipG = pivotGroup(PW), wx = -PW[0], wy = -PW[1];
    part(128, 12, 14, wood, 336 + wx, 36 + wy, wipG);
    part(18, 18, 14, wood, CAP[0] + wx, CAP[1] + 9 + wy, wipG); part(20, 3, 16, feltR, CAP[0] + wx, CAP[1] + 1.5 + wy, wipG);
    part(8, 30, 14, wood, PR[0] + wx, 52 + wy, wipG);            // repetition lever flange
    pin(PW);
    // Jack: long arm up to the knuckle, short toe towards the let-off button.
    const jackG = pivotGroup([JACK[0] - PW[0], JACK[1] - PW[1]], wipG);
    const jackMat = M.plastic(0xffb547, { roughness: 0.5 });
    part(7, JACK_TOP, 12, jackMat, 0, JACK_TOP / 2, jackG);
    part(15, 5, 12, jackMat, TOE[0] / 2 - 2, TOE[1], jackG);
    pin([0, 0], jackG);
    // Repetition lever and its spring.
    const repG = pivotGroup([PR[0] - PW[0], PR[1] - PW[1]], wipG);
    part(96, 7, 10, M.plastic(0xff7a59, { roughness: 0.5 }), 369 - 21 - PR[0], 75.5 - PR[1], repG, 8);
    const spring = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1, 8), M.metal(0xc9ced6)); repG.add(spring);
    pin([0, 0], repG);
    // Let-off button (hangs from its rail) and the drop screw.
    part(80, 8, 20, rail, 350, BUTTON_Y + 26, root, -14);
    part(3, 20, 3, M.metal(0xc9ced6), JACK[0] + TOE[0] - 3, BUTTON_Y + 12, root, -4);
    part(12, 6, 12, feltR, JACK[0] + TOE[0] - 3, BUTTON_Y + 3, root, -4);
    const dropScrew = part(3, 18, 3, M.metal(0xc9ced6), 318, DROP_Y + 18, root, 8);
    void dropScrew;

    // Hammer: flange on the hammer rail, shank, knuckle, wooden molding and felt head.
    part(50, 16, 60, rail, PH[0] - 4, PH[1] + 22);
    part(12, 22, 14, wood, PH[0], PH[1] + 8);
    const hamG = pivotGroup(PH), hx = -PH[0], hy = -PH[1];
    part(126, 7, 7, wood, 418 + hx, 92 + hy, hamG);
    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 20), M.matte(0xefe2c6)); knuckle.rotation.x = Math.PI / 2; knuckle.position.set(KNUCKLE[0] + hx, KNUCKLE[1] + 6 + hy, 0); hamG.add(knuckle);
    part(22, 40, 14, dark, 473 + hx, 108 + hy, hamG);            // molding
    part(26, 22, 16, felt, 473 + hx, 126 + hy, hamG);            // felt
    const crownM = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 16, 24, 1, false, -Math.PI / 2, Math.PI), felt); crownM.rotation.x = -Math.PI / 2; crownM.position.set(473 + hx, 127 + hy, 0); hamG.add(crownM);
    part(10, 12, 14, dark, TAIL[0] + hx, TAIL[1] + 2 + hy, hamG);
    pin(PH);

    // The strings (three, one behind another) and the plate's agraffe at the front end.
    const strings = [];
    const SX0 = 250, SX1 = 1180, NSEG = 80;
    for (const z of [-5, 0, 5]) {
      const g = new THREE.CylinderGeometry(0.9, 0.9, SX1 - SX0, 6, NSEG, true); g.rotateZ(-Math.PI / 2);
      const m = new THREE.Mesh(g, M.metal(0xe6eaf0, { roughness: 0.2 })); m.position.set((SX0 + SX1) / 2, STRING_Y + 0.9, z); root.add(m);
      m.userData.base = Float32Array.from(g.attributes.position.array);
      strings.push(m);
    }
    part(28, 40, 24, M.metal(0xc7a14c, { roughness: 0.4, metalness: 0.7 }), SX0 - 4, STRING_Y + 22);
    part(60, 30, 50, M.matte(0x8f6a3e), 1150, STRING_Y - 16);      // bridge, far back
    // Damper: head on the strings, wire down to its underlever, lifted by the key's end.
    const DX = 540, UL = [660, 30], ULPAD = [512, 6], WIREX = DX;
    part(18, 30, 50, rail, UL[0] + 10, UL[1] + 18);
    const ulG = pivotGroup(UL), ux = -UL[0], uy = -UL[1];
    part(UL[0] - ULPAD[0] + 16, 8, 12, wood, (UL[0] + ULPAD[0]) / 2 + ux, ULPAD[1] + 8 + uy, ulG);
    part(14, 4, 14, feltR, ULPAD[0] + ux, ULPAD[1] + 2 + uy, ulG);
    pin(UL);
    const dampG = new THREE.Group(); root.add(dampG);
    part(24, 18, 40, wood, DX, STRING_Y + 17.8, dampG); part(24, 7, 40, M.matte(0x30333c), DX, STRING_Y + 5.3, dampG);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1, 8), M.metal(0xc9ced6)); root.add(wire);
    part(60, 8, 50, rail, DX, STRING_Y + 60, root, -6);          // damper guide rail

    // Glow markers: where the action is doing something interesting.
    const spark = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), hot); root.add(spark);

    // Labels.
    const L = (t, parent, pos, cls) => stage.label(t, pos, parent, cls);
    const lab = {
      key: L('Key', keyG, [100 + kx, -40 + ky, 0]),
      bal: L('Balance rail', root, [PK[0], -86, 0]),
      cap: L('Capstan', keyG, [CAP[0] - 36 + kx, 6 + ky, 0]),
      wip: L('Wippen', wipG, [300 + wx, 20 + wy, 0]),
      jack: L('Jack', jackG, [-26, 30, 0], 'hot'),
      let: L('Let-off button', root, [JACK[0] + TOE[0] - 75, BUTTON_Y + 8, 0]),
      rep: L('Repetition lever', repG, [-45, 24, 0]),
      ham: L('Hammer', hamG, [473 + hx, 176 + hy, 0], 'hot'),
      shank: L('Shank and knuckle', hamG, [425 + hx, 70 + hy, 0]),
      bc: L('Backcheck', bc, [tailInKey[0] + 46 + kx, tailInKey[1] - 30 + ky, 0]),
      damp: L('Damper', dampG, [DX + 50, STRING_Y + 36, 0]),
      str: L('String (3 of them)', root, [900, STRING_Y + 26, 0]),
    };
    const minor = [lab.bal, lab.cap, lab.shank, lab.let, lab.str];

    // Simulation, in real seconds and millimetres.
    const sim = { d: 0, target: 0, vKey: 500, phi: 0, omega: 0, state: 'engaged', psi: 0, lam: 0, damp: 0, t: 0, vib: 0, vibT: 0, strikeV: 0, strikes: 0, pressT: null, toStrike: null, msg: 'Ready. Press Strike.' };
    const queue = [];          // [{ at: real seconds from now, d, fast }]
    const vKeyFor = (s) => (s.speed / 5) * 1000;      // key front speed, mm/s (hammer ≈ 5 × key)
    let sRef = null;
    const plan = (steps) => { queue.length = 0; let t = 0; for (const [dt, d, fast] of steps) { t += dt; queue.push({ at: sim.t + t, d, fast }); } };
    const api = {
      tap(hold = 0.06) { plan([[0, DIP, true], [hold + 0.03, 0, false]]); },
      hold() { plan([[0, DIP, true]]); },
      release() { plan([[0, 0, false]]); },
      repeat() { plan([[0, DIP, true], [0.12, 5.2, false], [0.07, DIP, true], [0.1, 5.2, false], [0.07, DIP, true], [0.12, 0, false]]); },
    };

    function stepSim(h) {
      sim.t += h;
      while (queue.length && queue[0].at <= sim.t) { const q = queue.shift(); sim.target = q.d; sim.fast = q.fast; if (q.fast && sim.d < 0.5) { sim.pressT = sim.t; } }
      // The key: pressed at the chosen speed, rises back at about 150 mm/s under its own weight.
      const v = sim.target > sim.d ? vKeyFor(sRef) : 150;
      const prevD = sim.d;
      sim.d = sim.target > sim.d ? Math.min(sim.target, sim.d + v * h) : Math.max(sim.target, sim.d - v * h);
      if (sim.d > sim.target - 1e-6 && sim.target === DIP) sim.d = Math.min(DIP, sim.d);
      const d = sim.d;
      const pk = phiK(d);
      if (sim.state === 'engaged') {
        const prev = sim.phi; sim.phi = pk; sim.omega = (sim.phi - prev) / h;
        if (d >= D_LET && d > prevD) { sim.state = 'free'; sim.msg = 'Let-off! The jack tips out and the hammer flies free.'; }
      } else if (sim.state === 'free') {
        sim.omega -= G_ANG * Math.cos(sim.phi) * h;
        sim.phi += sim.omega * h;
        if (sim.phi >= PHI_S && sim.omega > 0) {
          const vHead = sim.omega * 0.118;
          sim.strikeV = vHead; sim.strikes++; sim.vib = Math.min(1.4, vHead / 3); sim.vibT = 0;
          if (sim.pressT !== null) { sim.toStrike = sim.t - sim.pressT; sim.pressT = null; }
          sim.omega = -0.5 * sim.omega;                    // the felt bounces it back at about half speed
          sim.phi = PHI_S;
          sim.msg = `Hit the string at ${vHead.toFixed(1)} m/s, and bounced off.`;
          synth.strike(NOTE, vHead);
        }
        // Caught by the backcheck (only while the key is down), or back on the jack / repetition lever.
        if (sim.omega < 0 && d >= 8.5 && sim.phi <= PHI_C) { sim.state = 'checked'; sim.phi = PHI_C; sim.omega = 0; sim.msg = 'The backcheck catches the falling hammer.'; }
        // With the key down, the falling hammer squashes the repetition spring and the backcheck
        // catches it. With the key up, it lands on the repetition lever or the jack.
        const floor = d < D_LET - 0.8 ? pk : d >= 8.5 ? -1 : phiHold(d);
        if (sim.omega < 0 && sim.phi <= floor) { sim.phi = floor; sim.omega = 0; sim.state = d < D_LET - 0.8 ? 'engaged' : 'rep'; if (sim.state === 'rep') sim.msg = 'The repetition lever holds the hammer up. The jack slips back underneath.'; }
      } else if (sim.state === 'checked') {
        sim.phi = PHI_C;
        if (d < 8.5) { sim.state = 'rep'; sim.msg = 'Key rises a little: the repetition lever lifts the hammer and the jack resets.'; }
      } else if (sim.state === 'rep') {
        const hold = phiHold(d);
        sim.phi = approach(sim.phi, Math.max(hold, pk), 60, h);
        if (pk >= sim.phi - 0.002 && d < D_LET) { sim.state = 'engaged'; sim.msg = 'The jack is under the knuckle again: ready to strike.'; }
        if (d >= D_LET && d > prevD && pk >= sim.phi - 0.004) { sim.state = 'free'; }
      }
      // Jack: tipped out by the button past let-off; while the hammer is up it is held out by the knuckle.
      const want = sim.state === 'engaged' ? 0 : Math.max(jackPsi(d), d >= D_LET - 0.8 ? 0.09 : 0);
      sim.psi = approach(sim.psi, Math.max(jackPsi(d), want), 400, h);
      // Damper: the key end lifts the underlever after a 4 mm gap.
      const endRise = rot([ULPAD[0], 0], PK, keyA(d))[1] - rot([ULPAD[0], 0], PK, 0)[1];
      const prevDamp = sim.damp;
      sim.damp = Math.max(0, endRise - 4);
      if (prevDamp > 0.5 && sim.damp <= 0.5) { synth.damp(NOTE); sim.vib *= 0; if (sim.state === 'engaged' && d < 1) sim.msg = 'The damper lands on the string: silence.'; }
      sim.vibT += h;
    }

    const endPos = new THREE.Vector3();
    let shown = 0;
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        sRef = s;
        synth.sync();
        const real = dt * s.slow, n = Math.max(1, Math.ceil(real / 0.0002)), h = real / n;
        for (let i = 0; i < n; i++) stepSim(h);
        const d = sim.d;
        keyG.rotation.z = keyA(d);
        wipG.rotation.z = wipA(d);
        jackG.rotation.z = sim.psi * 2.2;                   // the jack's tilt is drawn about twice as big so you can see it
        hamG.rotation.z = sim.phi;
        // Repetition lever: pushed up by its spring until it meets the knuckle or the drop screw.
        const ky2 = knuckleY(sim.phi) - 1.5;
        const lamMax = solve((l) => repTipY(d, l), Math.min(DROP_Y, ky2), -0.2, REP_LIFT);
        sim.lam = clamp(lamMax, -0.2, REP_LIFT);
        repG.rotation.z = sim.lam;
        spring.position.set(369 - PR[0] + 10, 75.5 - PR[1] - 14, 0); spring.scale.y = 16;
        // Damper underlever and wire.
        const lift = sim.damp * ((UL[0] - WIREX) / (UL[0] - ULPAD[0]));
        ulG.rotation.z = -Math.asin(sim.damp / (UL[0] - ULPAD[0]));
        dampG.position.y = lift;
        const wy0 = rot([WIREX, ULPAD[1] + 12], UL, ulG.rotation.z)[1];
        wire.position.set(WIREX, (wy0 + STRING_Y + 16 + lift) / 2, 0); wire.scale.y = STRING_Y + 16 + lift - wy0;
        // String vibration: a decaying standing wave, drawn slowly and much bigger than life.
        sim.vib *= Math.exp(-dt * (sim.damp > 0.5 ? 0.15 : 0.8));
        shown = approach(shown, sim.vib, 12, dt);
        for (const m of strings) {
          const base = m.userData.base, pos = m.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const x = base[i * 3];
            const u = (x + (SX1 - SX0) / 2) / (SX1 - SX0);
            pos.array[i * 3 + 1] = base[i * 3 + 1] + shown * 9 * Math.sin(Math.PI * u) * Math.sin(time * 9);
          }
          pos.needsUpdate = true;
        }
        time += dt;
        // A spark shows the contact that matters right now.
        const jt = rot([0, JACK_TOP], [0, 0], wipA(d) + sim.psi * 2.2), jp = jackPivot(d);
        const sp = sim.state === 'engaged' ? [jp[0] + jt[0], jp[1] + jt[1]] : sim.state === 'free' ? rot(CROWN, PH, sim.phi) : sim.state === 'checked' ? rot(TAIL, PH, sim.phi) : [369, ky2];
        spark.position.set(sp[0], sp[1], 8);
        spark.visible = d > 0.2 || sim.state !== 'engaged';
        const narrow = stage.host.clientWidth < 560;
        minor.forEach((l) => { l.visible = !narrow; });
        void endPos;
      },
      readout: (s) => compact((() => {
        const rise = crownY(sim.phi) - crownY(0);
        return `<div class="big">${sim.msg}</div>
          <div class="row"><span>Key pressed down</span><b>${sim.d.toFixed(1)} of 10 mm</b></div>
          <div class="row"><span>Hammer lifted</span><b>${Math.max(0, rise).toFixed(0)} mm (string at ${(STRING_Y - crownY(0)).toFixed(0)} mm)</b></div>
          <div class="row"><span>Let-off at</span><b>${D_LET.toFixed(1)} mm of key, 2 mm from the string</b></div>
          <div class="row"><span>Damper</span><b>${sim.damp > 0.5 ? 'lifted off the string' : 'resting on the string'}</b></div>
          ${sim.strikes ? `<div class="row"><span>Last strike</span><b>${sim.strikeV.toFixed(1)} m/s${sim.toStrike ? `, ${(sim.toStrike * 1000).toFixed(0)} ms after the key started moving` : ''}</b></div>` : ''}
          <small>${s.slow < 1 ? `Shown ${Math.round(1 / s.slow)}× slower than real life.` : 'Real speed: it is all over in a few hundredths of a second.'}</small>`;
      })(), stage),
      dispose() { synth.allOff(); },
    };
  },
};
let time = 0;
export const _geom = () => ({ STRING_Y, D_LET, PHI_S, PHI_C, BUTTON_Y, DROP_Y, rise: crownY(0), phiK10: phiK(10), wip10: wipA(10), psi10: jackPsi(10), hold: [0, 3, 5, 7, 9, 10].map((d) => [d, phiHold(d).toFixed(3), phiK(d).toFixed(3)]) });
