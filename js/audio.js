/* Soundtrack: a generated dark-fantasy score (Web Audio), with realm ambience and UI sounds.
   If assets/audio/theme.mp3 exists, it plays that file instead of the generated score. */
(function () {
  let ctx, master, music, sfx, verb, amb, ambFilter, ambGain, fileEl = null;
  let on = false, started = false, timer = 0, nextBar = 0, bar = 0, realm = "home";

  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  // D minor: i – VI – iv – V  (Dm, Bb, Gm, A)
  const CHORDS = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 46, 50, 55], [45, 49, 52, 57]];
  const BELL = [74, 77, 79, 81, 84, 86, 89];

  const LITE = matchMedia("(hover: none)").matches; // phones: shorter, mono reverb (convolution is the costliest part of the score)
  function impulse(sec, decay) {
    const ch = LITE ? 1 : 2, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(ch, len, ctx.sampleRate);
    for (let c = 0; c < ch; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function noiseBuf(sec) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0; master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(LITE ? 2.2 : 4.5, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.55; verb.connect(wet); wet.connect(master);
    music = ctx.createGain(); music.gain.value = 0.8; music.connect(master); music.connect(verb);
    sfx = ctx.createGain(); sfx.gain.value = 0.5; sfx.connect(master); sfx.connect(verb);
    // continuous low drone
    [[38, 0.10, "sine"], [26, 0.12, "sine"], [45, 0.04, "triangle"]].forEach(([n, g, type]) => {
      const o = ctx.createOscillator(), gg = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = type; o.frequency.value = N(n); gg.gain.value = g;
      l.frequency.value = 0.07 + Math.random() * 0.05; lg.gain.value = g * 0.5; l.connect(lg); lg.connect(gg.gain);
      o.connect(gg); gg.connect(music); o.start(); l.start();
    });
    // realm ambience (filtered noise)
    amb = ctx.createBufferSource(); amb.buffer = noiseBuf(4); amb.loop = true;
    ambFilter = ctx.createBiquadFilter(); ambGain = ctx.createGain(); ambGain.gain.value = 0;
    amb.connect(ambFilter); ambFilter.connect(ambGain); ambGain.connect(master); amb.start();
  }

  function pad(chord, t, dur) {
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(1100, t + dur * 0.5); f.frequency.linearRampToValueAtTime(420, t + dur + 2); f.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 2.4); g.gain.setValueAtTime(0.05, t + dur - 0.5); g.gain.linearRampToValueAtTime(0, t + dur + 2.5);
    f.connect(g); g.connect(music);
    chord.forEach(n => [-7, 7].forEach(cents => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = N(n); o.detune.value = cents; o.connect(f); o.start(t); o.stop(t + dur + 3); }));
  }
  function drum(t, v = 1, low = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140 * low, t); o.frequency.exponentialRampToValueAtTime(42 * low, t + 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(music); o.start(t); o.stop(t + 1.2);
    const n = ctx.createBufferSource(); n.buffer = noiseBuf(0.3); const nf = ctx.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 900; const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.18 * v, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); n.connect(nf); nf.connect(ng); ng.connect(music); n.start(t);
  }
  function bell(t, n, v = 0.07) {
    [1, 2.76, 5.4].forEach((h, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i ? "sine" : "triangle"; o.frequency.value = N(n) * h;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v / (i + 1), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2 / (i + 1));
      o.connect(g); g.connect(music); o.start(t); o.stop(t + 3.5);
    });
  }

  function schedule() {
    const BAR = 4.8; // seconds per bar (~50 bpm, 4/4)
    while (nextBar < ctx.currentTime + 1.2) {
      const t = nextBar, beat = BAR / 4, ch = CHORDS[Math.floor(bar / 2) % 4];
      if (bar % 2 === 0) pad(ch, t, BAR * 2);
      const low = realm === "earth" ? 0.8 : 1;
      if (bar >= 2) { drum(t, 1, low); drum(t + beat * 2, 0.7, low); if (bar % 4 === 3) { drum(t + beat * 3, 0.5, low); drum(t + beat * 3.5, 0.6, low); } }
      const bells = realm === "ether" ? 4 : 2;
      for (let i = 0; i < bells; i++) if (Math.random() < 0.7) bell(t + Math.random() * BAR, BELL[Math.floor(Math.random() * BELL.length)] + (realm === "ether" ? 12 : 0));
      nextBar += BAR; bar++;
    }
  }

  const AMB = {
    home: ["lowpass", 500, 0.02], earth: ["lowpass", 260, 0.05], fire: ["bandpass", 1800, 0.035],
    water: ["lowpass", 700, 0.07], air: ["bandpass", 600, 0.06], ether: ["highpass", 6000, 0.008]
  };
  function setRealm(r) {
    realm = AMB[r] ? r : ({ trials: "home", chronicle: "ether", rules: "earth", guild: "fire", patrons: "earth", contact: "water", realms: "home" })[r] || "home";
    if (!ctx) return;
    const [type, freq, g] = AMB[realm], t = ctx.currentTime;
    ambGain.gain.cancelScheduledValues(t); ambGain.gain.setTargetAtTime(0, t, 0.3);
    setTimeout(() => { ambFilter.type = type; ambFilter.frequency.value = freq; ambFilter.Q.value = type === "bandpass" ? 0.8 : 0.5; ambGain.gain.setTargetAtTime(g, ctx.currentTime, 1.2); }, 600);
  }

  async function checkFile() {
    const src = window.TV && TV.soundtrackFile; if (!src) return null;
    try { const r = await fetch(src, { method: "HEAD" }); if (r.ok && /audio/.test(r.headers.get("content-type") || "audio")) return src; } catch (e) {}
    return null;
  }

  async function start() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {} // iOS: play even when the silent switch is on
    if (!ctx) build();
    if (ctx.state === "suspended") await ctx.resume();
    on = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.7, ctx.currentTime, 0.8);
    if (!started) {
      started = true;
      const file = await checkFile();
      if (file) { fileEl = new Audio(file); fileEl.loop = true; const s = ctx.createMediaElementSource(fileEl); s.connect(master); fileEl.play().catch(() => {}); }
      else { nextBar = ctx.currentTime + 0.2; schedule(); timer = setInterval(schedule, 250); }
      setRealm(realm);
    } else if (fileEl) fileEl.play().catch(() => {});
    save(true);
  }
  function stop() {
    on = false; save(false);
    if (!ctx) return;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    if (fileEl) setTimeout(() => !on && fileEl.pause(), 900);
  }
  function save(v) { try { localStorage.setItem("tv-sound", v ? "1" : "0"); } catch (e) {} }

  function ui(kind) {
    if (!on || !ctx) return;
    const t = ctx.currentTime;
    if (kind === "hover") { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(1300, t + 0.06); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.1); }
    if (kind === "click") { [523, 1046 * 1.003, 1567].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i ? "sine" : "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.09 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2 / (i + 1)); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 1.3); }); }
    if (kind === "travel") { const n = ctx.createBufferSource(); n.buffer = noiseBuf(1.6); const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 3; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.7); f.frequency.exponentialRampToValueAtTime(300, t + 1.5); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5); n.connect(f); f.connect(g); g.connect(sfx); n.start(t); drum(t + 0.75, 0.8, 0.7); }
    if (kind === "discover") { bell(t, 62, 0.12); bell(t + 0.18, 69, 0.1); bell(t + 0.36, 74, 0.1); }
  }

  // Phones: stop the score when the tab is hidden / screen locks, and resume when back (timers are throttled in the background, so it would stutter and drift otherwise).
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend(); if (fileEl) fileEl.pause(); }
    else if (on) { ctx.resume(); if (fileEl) fileEl.play().catch(() => {}); }
  });

  window.AUDIO = { start, stop, toggle: () => (on ? stop() : start(), on), isOn: () => on, setRealm, ui };
})();
