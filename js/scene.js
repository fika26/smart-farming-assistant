/* Scenery engine: painted-looking realm landscapes (canvas) + living atmosphere particles.
   Drop assets/scenes/<mode>.webp to replace a code-painted landscape with your own art. */
(function () {
  const world = document.getElementById("world");
  const imgLayer = document.getElementById("scene-img");
  const fx = document.getElementById("scene-fx");
  const fctx = fx.getContext("2d");
  const bgA = document.getElementById("scene-bg");
  const bgB = bgA.cloneNode(); bgB.id = "scene-bg-b"; bgA.after(bgB);
  let front = bgA, back = bgB;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TOUCH = matchMedia("(hover: none)").matches || innerWidth < 760;

  // Android/iOS: the visible viewport grows/shrinks as the address bar hides while scrolling. A canvas sized to it
  // visibly stretches and jumps ("glitching background"), so size the world to the large viewport (100lvh) instead.
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:100lvh;pointer-events:none;visibility:hidden";
  document.body.appendChild(probe);
  const bigH = () => Math.max(probe.offsetHeight || 0, innerHeight);
  let lastFx = 0;

  let W = 0, H = 0, DPR = 1, mode = null, parts = [], anchors = {}, t0 = performance.now();
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const imgCache = {};

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function noise1(seed) {
    const r = rng(seed), v = Array.from({ length: 256 }, r);
    return x => { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return v[i & 255] * (1 - s) + v[(i + 1) & 255] * s; };
  }
  function fbm(n, x, oct = 4) { let a = 0, amp = 1, f = 1, tot = 0; for (let i = 0; i < oct; i++) { a += n(x * f) * amp; tot += amp; amp *= 0.5; f *= 2.1; } return a / tot; }

  /* ---------------- painting helpers ---------------- */
  function sky(c, stops) {
    const g = c.createLinearGradient(0, 0, 0, H);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function glow(c, x, y, r, col, a = 1) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
  }
  function stars(c, n, seed, ymax, col = "255,255,255") {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H * ymax, s = r() * 1.4 + 0.2;
      c.fillStyle = `rgba(${col},${(0.25 + r() * 0.75) * (1 - y / (H * ymax))})`;
      c.fillRect(x, y, s, s);
    }
  }
  function ridge(c, baseY, amp, freq, col, seed, o = {}) {
    const n = noise1(seed);
    c.beginPath(); c.moveTo(0, H);
    const pts = [];
    for (let x = 0; x <= W + 8; x += 6) {
      let v = fbm(n, x / W * freq + seed * 0.13, o.oct || 5);
      if (o.mesa) v = Math.min(v, o.mesa) + (v > o.mesa ? (v - o.mesa) * 0.08 : 0);
      if (o.peak) v = Math.pow(v, o.peak);
      const y = baseY - v * amp;
      pts.push([x, y]); c.lineTo(x, y);
    }
    c.lineTo(W, H); c.closePath();
    if (Array.isArray(col)) { const g = c.createLinearGradient(0, baseY - amp, 0, H); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); c.fillStyle = g; } else c.fillStyle = col;
    c.fill();
    if (o.rim) { c.strokeStyle = o.rim; c.lineWidth = 1.2; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
    return x => { const i = Math.max(0, Math.min(pts.length - 1, Math.round(x / 6))); return pts[i][1]; };
  }
  function haze(c, y, h, col) {
    const g = c.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, col); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.fillRect(0, y - h, W, h * 2);
  }
  function gearSil(c, x, y, r, teeth, col, rot = 0, hole = "rgba(0,0,0,0)") {
    c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
    const st = Math.PI * 2 / teeth;
    for (let i = 0; i < teeth; i++) {
      const a = i * st;
      [[r * 0.86, a], [r * 0.86, a + st * 0.18], [r, a + st * 0.3], [r, a + st * 0.7], [r * 0.86, a + st * 0.82]].forEach(([rr, aa], k) => {
        const px = rr * Math.cos(aa), py = rr * Math.sin(aa); (i === 0 && k === 0) ? c.moveTo(px, py) : c.lineTo(px, py);
      });
    }
    c.closePath(); c.moveTo(r * 0.42, 0); c.arc(0, 0, r * 0.42, 0, Math.PI * 2, true);
    c.fillStyle = col; c.fill("evenodd");
    // spokes
    c.fillStyle = col;
    for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * Math.PI / 3); c.fillRect(-r * 0.05, 0, r * 0.1, r * 0.45); c.restore(); }
    c.beginPath(); c.arc(0, 0, r * 0.12, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function spire(c, x, base, w, h, col, win) {
    c.fillStyle = col; c.beginPath();
    c.moveTo(x - w / 2, base); c.lineTo(x - w / 2, base - h * 0.62); c.lineTo(x - w * 0.32, base - h * 0.7);
    c.lineTo(x, base - h); c.lineTo(x + w * 0.32, base - h * 0.7); c.lineTo(x + w / 2, base - h * 0.62); c.lineTo(x + w / 2, base); c.fill();
    if (win) { c.fillStyle = win; for (let k = 1; k < 4; k++) c.fillRect(x - 1, base - h * 0.62 + k * h * 0.12, 2, h * 0.05); }
  }
  function citadel(c, cx, base, s, col, win, glowCol) {
    glowCol && glow(c, cx, base - 160 * s, 260 * s, glowCol, 0.55);
    gearSil(c, cx, base - 150 * s, 110 * s, 28, col, 0.1);
    const towers = [[-150, 26, 170], [-110, 30, 230], [-64, 36, 300], [-22, 44, 380], [22, 40, 340], [66, 34, 280], [112, 30, 210], [152, 24, 150]];
    towers.forEach(([dx, w, h]) => spire(c, cx + dx * s, base, w * s, h * s, col, win));
    c.fillStyle = col; c.fillRect(cx - 175 * s, base - 70 * s, 350 * s, 70 * s);
    c.beginPath(); c.moveTo(cx - 260 * s, base); c.quadraticCurveTo(cx, base - 110 * s, cx + 260 * s, base); c.fill();
  }
  function pylon(c, x, base, h, col) {
    c.strokeStyle = col; c.lineWidth = Math.max(1, h / 120);
    const w = h * 0.22;
    c.beginPath(); c.moveTo(x - w, base); c.lineTo(x - w * 0.12, base - h); c.lineTo(x + w * 0.12, base - h); c.lineTo(x + w, base); c.stroke();
    for (let i = 1; i < 8; i++) { const y = base - h * i / 8, ww = w * (1 - i / 8) + w * 0.12 * (i / 8); c.beginPath(); c.moveTo(x - ww, y); c.lineTo(x + ww, y); c.stroke(); if (i < 7) { const y2 = base - h * (i + 1) / 8, w2 = w * (1 - (i + 1) / 8) + w * 0.12 * ((i + 1) / 8); c.beginPath(); c.moveTo(x - ww, y); c.lineTo(x + w2, y2); c.moveTo(x + ww, y); c.lineTo(x - w2, y2); c.stroke(); } }
    c.beginPath(); c.moveTo(x - w * 0.9, base - h * 0.78); c.lineTo(x + w * 0.9, base - h * 0.78); c.stroke();
    c.fillStyle = col; c.beginPath(); c.arc(x, base - h - 6, h * 0.035 + 2, 0, Math.PI * 2); c.fill();
    return [x, base - h - 6];
  }
  function island(c, x, y, w, col, r, rimCol) {
    c.fillStyle = col; c.beginPath(); c.moveTo(x - w / 2, y);
    for (let i = 0; i <= 10; i++) { const px = x - w / 2 + w * i / 10; c.lineTo(px, y - (r() * 0.06 + 0.02) * w * Math.sin(Math.PI * i / 10)); }
    const depth = w * (0.55 + r() * 0.3);
    for (let i = 10; i >= 0; i--) { const px = x - w / 2 + w * i / 10; const d = Math.sin(Math.PI * i / 10); c.lineTo(px + (r() - 0.5) * w * 0.05, y + depth * Math.pow(d, 1.6) * (0.7 + r() * 0.3)); }
    c.closePath(); c.fill();
    if (rimCol) { c.strokeStyle = rimCol; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x + w / 2, y); c.stroke(); }
    c.strokeStyle = col; c.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const px = x - w * 0.3 + r() * w * 0.6; c.beginPath(); c.moveTo(px, y + depth * 0.4); c.quadraticCurveTo(px + 8, y + depth * 0.8, px + (r() - 0.5) * 20, y + depth * (0.9 + r() * 0.6)); c.stroke(); }
    return depth;
  }

  /* ---------------- realms ---------------- */
  const THEMES = {
    home: {
      eye: "#ffcf7a",
      paint(c) {
        sky(c, ["#07060b", "#1a0f1f", "#4a1f2a", "#a24a2c", "#e39a52"]);
        stars(c, 220, 11, 0.45);
        glow(c, W * 0.5, H * 0.66, H * 0.75, "rgba(255,170,90,.55)");
        glow(c, W * 0.5, H * 0.66, H * 0.16, "rgba(255,230,170,.9)");
        ridge(c, H * 0.72, H * 0.28, 2.2, "#3a1b26", 21, { peak: 1.4 });
        haze(c, H * 0.7, H * 0.06, "rgba(255,170,110,.18)");
        const g = ridge(c, H * 0.84, H * 0.22, 3.1, "#22101a", 33, { peak: 1.2 });
        citadel(c, W * 0.5, H * 0.79, Math.min(W, H * 1.6) / 1300, "#170b12", "rgba(255,190,110,.75)", "rgba(255,190,110,.35)");
        haze(c, H * 0.82, H * 0.06, "rgba(255,150,100,.14)");
        ridge(c, H * 1.02, H * 0.2, 4, ["#0b060a", "#050305"], 47, { peak: 1.1 });
        anchors.horizon = H * 0.72;
      },
      fx: "embers", fxColor: [255, 196, 120]
    },
    earth: {
      eye: "#ffb15c",
      paint(c) {
        sky(c, ["#0b0806", "#24170d", "#5a3a1f", "#a87440", "#d8a868"]);
        glow(c, W * 0.72, H * 0.58, H * 0.6, "rgba(255,190,120,.35)");
        glow(c, W * 0.72, H * 0.58, H * 0.07, "rgba(255,235,190,.9)");
        ridge(c, H * 0.68, H * 0.3, 1.6, "#5b3b22", 5, { mesa: 0.62, oct: 4 });
        haze(c, H * 0.66, H * 0.07, "rgba(240,190,130,.22)");
        const s = Math.min(W, H * 1.6) / 1300;
        gearSil(c, W * 0.22, H * 0.74, 230 * s, 24, "#2e1d10", 0.3);
        gearSil(c, W * 0.86, H * 0.8, 150 * s, 18, "#2e1d10", 0.8);
        ridge(c, H * 0.84, H * 0.22, 2.4, "#2c1c10", 8, { mesa: 0.55, oct: 5 });
        gearSil(c, W * 0.6, H * 0.94, 120 * s, 16, "#120b06", 1.2);
        ridge(c, H * 1.02, H * 0.18, 5, ["#120b06", "#070402"], 9, { peak: 1.2 });
      },
      fx: "dust", fxColor: [240, 200, 150]
    },
    fire: {
      eye: "#ff7a3d",
      paint(c) {
        sky(c, ["#060203", "#1c0505", "#4a0d07", "#9b2a0e", "#ef6a2a"]);
        glow(c, W * 0.5, H * 0.95, H * 0.8, "rgba(255,90,30,.5)");
        const r1 = ridge(c, H * 0.7, H * 0.42, 1.3, "#2a0907", 61, { peak: 2.2, rim: "rgba(255,120,60,.35)" });
        haze(c, H * 0.66, H * 0.1, "rgba(255,90,40,.18)");
        ridge(c, H * 0.86, H * 0.2, 3, "#140404", 63, { peak: 1.3, rim: "rgba(255,110,50,.25)" });
        const s = Math.min(W, H * 1.6) / 1300;
        anchors.towers = [pylon(c, W * 0.16, H * 0.86, 360 * s, "#0e0303"), pylon(c, W * 0.42, H * 0.84, 250 * s, "#0e0303"), pylon(c, W * 0.66, H * 0.85, 300 * s, "#0e0303"), pylon(c, W * 0.9, H * 0.86, 400 * s, "#0e0303")];
        ridge(c, H * 1.03, H * 0.16, 6, ["#090202", "#030101"], 67, { peak: 1.1 });
        // lava cracks
        c.strokeStyle = "rgba(255,120,40,.5)"; c.lineWidth = 1.5; const r = rng(4);
        for (let i = 0; i < 18; i++) { let x = r() * W, y = H * (0.93 + r() * 0.06); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 40; y += r() * 8; c.lineTo(x, y); } c.stroke(); }
      },
      fx: "fire", fxColor: [255, 140, 60]
    },
    water: {
      eye: "#62e0ef",
      paint(c) {
        sky(c, ["#02060a", "#061722", "#0b3340", "#17616b", "#2a8b94"]);
        stars(c, 160, 71, 0.5, "200,240,255");
        const hz = H * 0.62; anchors.horizon = hz;
        glow(c, W * 0.14, H * 0.2, H * 0.3, "rgba(170,240,255,.2)");
        c.fillStyle = "rgba(225,250,255,.85)"; c.beginPath(); c.arc(W * 0.14, H * 0.2, Math.min(W, H) * 0.035, 0, Math.PI * 2); c.fill();
        ridge(c, hz, H * 0.12, 2.4, "#082430", 73, { peak: 1.4 });
        // sea
        const g = c.createLinearGradient(0, hz, 0, H); g.addColorStop(0, "#0c3a45"); g.addColorStop(1, "#02080b");
        c.fillStyle = g; c.fillRect(0, hz, W, H - hz);
        // moon path
        c.fillStyle = "rgba(200,245,255,.25)"; const r = rng(77);
        for (let y = hz + 4; y < H; y += 5) { const k = (y - hz) / (H - hz); const w = 20 + k * 160 * r(); c.fillRect(W * 0.14 - w / 2 + (r() - 0.5) * 30 * k, y, w, 1.4); }
        // lighthouse on rock
        const s = Math.min(W, H * 1.6) / 1300, lx = W * 0.8;
        c.fillStyle = "#03090c"; c.beginPath(); c.moveTo(lx - 160 * s, hz + 30 * s); c.quadraticCurveTo(lx, hz - 60 * s, lx + 200 * s, hz + 30 * s); c.fill();
        c.beginPath(); c.moveTo(lx - 22 * s, hz - 20 * s); c.lineTo(lx - 14 * s, hz - 240 * s); c.lineTo(lx + 14 * s, hz - 240 * s); c.lineTo(lx + 22 * s, hz - 20 * s); c.fill();
        c.fillRect(lx - 20 * s, hz - 262 * s, 40 * s, 22 * s); c.beginPath(); c.moveTo(lx - 22 * s, hz - 262 * s); c.lineTo(lx, hz - 290 * s); c.lineTo(lx + 22 * s, hz - 262 * s); c.fill();
        glow(c, lx, hz - 251 * s, 60 * s, "rgba(200,255,255,.9)");
        anchors.lamp = [lx, hz - 251 * s];
        // sunken gear arcs
        gearSil(c, W * 0.12, H * 1.02, 240 * s, 22, "#020608", 0.2);
      },
      fx: "water", fxColor: [170, 235, 245]
    },
    air: {
      eye: "#cfe6ff",
      paint(c) {
        sky(c, ["#0b1219", "#20384c", "#557891", "#9fbdd0", "#d9e6ee"]);
        glow(c, W * 0.55, H * 0.4, H * 0.7, "rgba(255,250,235,.35)");
        const r = rng(91), s = Math.min(W, H * 1.6) / 1300;
        // cloud banks
        for (let i = 0; i < 26; i++) { const y = H * (0.62 + r() * 0.4); glow(c, r() * W, y, (120 + r() * 220) * s, "rgba(235,242,248,.5)", 0.6); }
        island(c, W * 0.18, H * 0.38, 300 * s, "#2a3946", r, "rgba(220,240,255,.4)");
        island(c, W * 0.8, H * 0.28, 220 * s, "#34485a", r, "rgba(220,240,255,.4)");
        island(c, W * 0.6, H * 0.6, 150 * s, "#3d5466", r, "rgba(220,240,255,.35)");
        island(c, W * 0.38, H * 0.18, 90 * s, "#4a6476", r);
        // windmill-turbine on island
        c.strokeStyle = "#2a3946"; c.lineWidth = 4 * s; const tx = W * 0.2, ty = H * 0.38;
        c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, ty - 120 * s); c.stroke();
        for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.4; c.beginPath(); c.moveTo(tx, ty - 120 * s); c.lineTo(tx + Math.cos(a) * 70 * s, ty - 120 * s + Math.sin(a) * 70 * s); c.stroke(); }
        for (let i = 0; i < 14; i++) { const y = H * (0.8 + r() * 0.3); glow(c, r() * W, y, (160 + r() * 260) * s, "rgba(245,248,252,.65)", 0.7); }
      },
      fx: "air", fxColor: [240, 248, 255]
    },
    ether: {
      eye: "#b59cff",
      paint(c) {
        sky(c, ["#03020a", "#0d0720", "#1d0f42", "#2c1a5e", "#120a2a"]);
        const r = rng(101);
        for (let i = 0; i < 9; i++) glow(c, W * (0.2 + r() * 0.7), H * (0.15 + r() * 0.6), H * (0.2 + r() * 0.35), ["rgba(140,90,255,.25)", "rgba(80,140,255,.18)", "rgba(220,90,200,.14)"][i % 3]);
        stars(c, 650, 103, 1, "235,225,255");
        const s = Math.min(W, H * 1.6) / 1300, px = W * 0.74, py = H * 0.36, pr = 150 * s;
        // planet + ring
        c.save(); c.translate(px, py); c.rotate(-0.35);
        c.strokeStyle = "rgba(200,180,255,.35)"; c.lineWidth = 6 * s; c.beginPath(); c.ellipse(0, 0, pr * 2, pr * 0.45, 0, Math.PI, Math.PI * 2); c.stroke();
        c.restore();
        const pg = c.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
        pg.addColorStop(0, "#8f78e6"); pg.addColorStop(0.6, "#3a2681"); pg.addColorStop(1, "#120a2c");
        c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
        c.save(); c.translate(px, py); c.rotate(-0.35);
        c.strokeStyle = "rgba(220,205,255,.5)"; c.lineWidth = 6 * s; c.beginPath(); c.ellipse(0, 0, pr * 2, pr * 0.45, 0, 0, Math.PI); c.stroke();
        c.restore();
        // obelisk monoliths
        ridge(c, H * 0.92, H * 0.12, 3, "#07041a", 107, { peak: 1.3 });
        [[0.1, 260], [0.2, 180], [0.9, 220]].forEach(([x, h]) => { c.fillStyle = "#07041a"; c.beginPath(); c.moveTo(W * x - 20 * s, H * 0.92); c.lineTo(W * x - 12 * s, H * 0.92 - h * s); c.lineTo(W * x, H * 0.92 - h * s - 26 * s); c.lineTo(W * x + 12 * s, H * 0.92 - h * s); c.lineTo(W * x + 20 * s, H * 0.92); c.fill(); c.fillStyle = "rgba(180,150,255,.8)"; c.fillRect(W * x - 1.5, H * 0.92 - h * s * 0.8, 3, h * s * 0.5); });
        ridge(c, H * 1.03, H * 0.1, 5, "#030110", 109);
      },
      fx: "ether", fxColor: [215, 200, 255]
    }
  };
  // other pages borrow a realm's sky
  const ALIAS = { trials: "home", chronicle: "ether", rules: "earth", guild: "fire", patrons: "earth", contact: "water", realms: "home" };

  /* ---------------- particles ---------------- */
  function spawn(kind) {
    const r = Math.random;
    switch (kind) {
      case "embers": case "fire": return { x: r() * W, y: H + 10 + r() * H * 0.3, vx: (r() - 0.5) * 0.3, vy: -(0.3 + r() * (kind === "fire" ? 1.4 : 0.8)), s: r() * 2.2 + 0.6, life: 0, max: 400 + r() * 500, wob: r() * 6 };
      case "dust": return { x: r() * W, y: r() * H, vx: 0.15 + r() * 0.45, vy: (r() - 0.5) * 0.12, s: r() * 2 + 0.4, life: 0, max: 600 + r() * 600, wob: r() * 6 };
      case "water": return { x: r() * W * 1.3, y: -20 - r() * H, vx: -2.2, vy: 9 + r() * 5, s: 10 + r() * 16, life: 0, max: 1e9 };
      case "air": return r() < 0.25 ? { x: -60, y: r() * H, vx: 2 + r() * 3, vy: (r() - 0.5) * 0.2, s: 0, cloud: 1, rad: 30 + r() * 80, life: 0, max: 1e9 } : { x: -200 - r() * W * 0.5, y: r() * H, vx: 6 + r() * 7, vy: 0, s: 60 + r() * 160, life: 0, max: 1e9 };
      case "ether": return { x: r() * W, y: r() * H, vx: (r() - 0.5) * 0.08, vy: (r() - 0.5) * 0.08, s: r() * 1.8 + 0.4, tw: r() * 6, life: 0, max: 1e9 };
    }
  }
  function count(kind) {
    const a = W * H / (1440 * 900);
    return Math.round(({ embers: 90, fire: 140, dust: 110, water: 160, air: 40, ether: 120 })[kind] * Math.max(0.35, Math.min(1.4, a)) * (TOUCH ? 0.4 : 1));
  }
  let arcs = [], nextArc = 0, shoot = null;

  function step(now) {
    const t = (now - t0) / 1000;
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    if (!TOUCH) { // parallax follows the mouse; phones have none, so don't touch styles every frame
      const tr = `translate3d(${(-mx * 14).toFixed(2)}px,${(-my * 9).toFixed(2)}px,0) scale(1.04)`;
      bgA.style.transform = bgB.style.transform = imgLayer.style.transform = tr;
      fx.style.transform = `translate3d(${(-mx * 26).toFixed(2)}px,${(-my * 16).toFixed(2)}px,0)`;
    }
    fctx.clearRect(0, 0, W, H);
    const th = THEMES[mode]; if (!th) return;
    const kind = th.fx, [cr, cg, cb] = th.fxColor;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.life++;
      if (kind === "embers" || kind === "fire" || kind === "dust") {
        p.x += p.vx + Math.sin(t * 0.8 + p.wob) * 0.25; p.y += p.vy;
        const k = p.life / p.max, a = Math.sin(Math.PI * Math.min(1, k)) * (kind === "dust" ? 0.5 : 0.95);
        fctx.fillStyle = `rgba(${cr},${cg - (kind === "fire" ? k * 60 : 0)},${cb},${a})`;
        if (kind !== "dust" && !TOUCH) { fctx.shadowBlur = 8; fctx.shadowColor = `rgba(${cr},${cg},${cb},.8)`; }
        fctx.beginPath(); fctx.arc(p.x, p.y, p.s, 0, 6.283); fctx.fill(); fctx.shadowBlur = 0;
        if (p.life > p.max || p.y < -20 || p.x > W + 20) parts[i] = spawn(kind);
      } else if (kind === "water") {
        p.x += p.vx; p.y += p.vy;
        fctx.strokeStyle = `rgba(${cr},${cg},${cb},.28)`; fctx.lineWidth = 1;
        fctx.beginPath(); fctx.moveTo(p.x, p.y); fctx.lineTo(p.x + p.vx * 2.2, p.y + p.s); fctx.stroke();
        if (p.y > (anchors.horizon || H) + Math.random() * (H - (anchors.horizon || H))) {
          if (Math.random() < 0.3) ripples.push({ x: p.x, y: p.y, r: 1, a: 0.5 });
          parts[i] = spawn(kind); parts[i].y = -10;
        }
      } else if (kind === "air") {
        p.x += p.vx;
        if (p.cloud) { glowFx(p.x, p.y, p.rad, `rgba(${cr},${cg},${cb},.07)`); }
        else { const g = fctx.createLinearGradient(p.x, 0, p.x + p.s, 0); g.addColorStop(0, `rgba(${cr},${cg},${cb},0)`); g.addColorStop(1, `rgba(${cr},${cg},${cb},.35)`); fctx.strokeStyle = g; fctx.lineWidth = 1; fctx.beginPath(); fctx.moveTo(p.x, p.y); fctx.quadraticCurveTo(p.x + p.s * 0.5, p.y - 6 * Math.sin(t + p.y), p.x + p.s, p.y); fctx.stroke(); }
        if (p.x > W + 300) parts[i] = spawn(kind);
      } else if (kind === "ether") {
        p.x += p.vx; p.y += p.vy;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + p.tw));
        fctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`; fctx.fillRect(p.x, p.y, p.s, p.s);
        if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) parts[i] = spawn(kind);
      }
    }
    if (kind === "ether" && !TOUCH) {
      fctx.lineWidth = 0.6;
      for (let i = 0; i < parts.length; i += 2) for (let j = i + 2; j < parts.length; j += 2) {
        const a = parts[i], b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) { fctx.strokeStyle = `rgba(${cr},${cg},${cb},${(1 - d / 110) * 0.22})`; fctx.beginPath(); fctx.moveTo(a.x, a.y); fctx.lineTo(b.x, b.y); fctx.stroke(); }
      }
      if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * W, y: Math.random() * H * 0.4, l: 0 };
      if (shoot) { shoot.l += 1; const x = shoot.x + shoot.l * 9, y = shoot.y + shoot.l * 4; const g = fctx.createLinearGradient(x - 120, y - 53, x, y); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,.85)"); fctx.strokeStyle = g; fctx.lineWidth = 1.5; fctx.beginPath(); fctx.moveTo(x - 120, y - 53); fctx.lineTo(x, y); fctx.stroke(); if (shoot.l > 40) shoot = null; }
    }
    if (kind === "water") {
      for (let i = ripples.length - 1; i >= 0; i--) { const q = ripples[i]; q.r += 0.6; q.a -= 0.012; if (q.a <= 0) { ripples.splice(i, 1); continue; } fctx.strokeStyle = `rgba(${cr},${cg},${cb},${q.a})`; fctx.beginPath(); fctx.ellipse(q.x, q.y, q.r * 2.2, q.r * 0.5, 0, 0, 6.283); fctx.stroke(); }
      if (anchors.lamp) { // rotating lighthouse beam
        const [lx, ly] = anchors.lamp, a = t * 0.6, len = W * 0.9;
        const g = fctx.createRadialGradient(lx, ly, 0, lx, ly, len); g.addColorStop(0, "rgba(220,255,255,.14)"); g.addColorStop(1, "rgba(220,255,255,0)");
        fctx.fillStyle = g; fctx.beginPath(); fctx.moveTo(lx, ly); fctx.arc(lx, ly, len, Math.PI + Math.sin(a) * 0.7 - 0.06, Math.PI + Math.sin(a) * 0.7 + 0.06); fctx.fill();
      }
    }
    if (kind === "fire" && anchors.towers) {
      if (now > nextArc) { const tw = anchors.towers, i = Math.floor(Math.random() * (tw.length - 1)); arcs.push({ a: tw[i], b: tw[i + 1], life: 14, seed: Math.random() * 1000 }); nextArc = now + 900 + Math.random() * 2600; }
      for (let i = arcs.length - 1; i >= 0; i--) { const z = arcs[i]; z.life--; if (z.life <= 0) { arcs.splice(i, 1); continue; } bolt(z.a, z.b, z.life / 14); }
    }
    if (!TOUCH && (mode === "home" || mode === "earth")) { // drifting fog bands
      for (let k = 0; k < 3; k++) { const y = H * (0.7 + k * 0.1), x = ((t * (8 + k * 5)) % (W + 800)) - 400; glowFx(x, y, 380, "rgba(255,210,170,.05)"); glowFx((x + W * 0.6) % (W + 800) - 400, y + 20, 300, "rgba(255,210,170,.04)"); }
    }
  }
  let ripples = [];
  function glowFx(x, y, r, col) { const g = fctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); fctx.fillStyle = g; fctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function bolt(a, b, k) {
    fctx.save(); fctx.shadowBlur = 18; fctx.shadowColor = "rgba(255,200,140,1)";
    fctx.strokeStyle = `rgba(255,235,200,${k})`; fctx.lineWidth = 1.6;
    fctx.beginPath(); fctx.moveTo(a[0], a[1]);
    const n = 14; for (let i = 1; i < n; i++) { const f = i / n; const sag = Math.sin(Math.PI * f) * 40; fctx.lineTo(a[0] + (b[0] - a[0]) * f + (Math.random() - 0.5) * 18, a[1] + (b[1] - a[1]) * f + sag + (Math.random() - 0.5) * 18); }
    fctx.lineTo(b[0], b[1]); fctx.stroke(); fctx.restore();
  }

  /* ---------------- control ---------------- */
  function size() {
    DPR = Math.min(TOUCH ? 1.25 : 1.5, window.devicePixelRatio || 1);
    W = innerWidth; H = bigH();
    world.style.height = H + "px";
    [bgA, bgB].forEach(c => { c.width = W * DPR; c.height = H * DPR; });
    fx.width = W; fx.height = H;
  }
  function paintInto(canvas, m) {
    const c = canvas.getContext("2d"); c.setTransform(DPR, 0, 0, DPR, 0, 0); anchors = {};
    THEMES[m].paint(c);
  }
  function tryImage(m) {
    if (m in imgCache) return Promise.resolve(imgCache[m]);
    return new Promise(res => { const im = new Image(); im.onload = () => res(imgCache[m] = im.src); im.onerror = () => res(imgCache[m] = null); im.src = `assets/scenes/${m}.webp`; });
  }

  let raf = 0, running = false;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (TOUCH && now - lastFx < 32) return; // ~30fps is plenty for drifting dust and keeps phones cool
    lastFx = now; step(now);
  }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  async function set(page) {
    const m = Object.prototype.hasOwnProperty.call(THEMES, page) ? page : (ALIAS[page] || "home");
    if (m === mode) return;
    mode = m;
    paintInto(back, m);
    back.classList.add("on"); front.classList.remove("on");
    [front, back] = [back, front];
    world.dataset.mode = m;
    document.documentElement.style.setProperty("--drone-eye", THEMES[m].eye);
    parts = Array.from({ length: count(THEMES[m].fx) }, () => { const p = spawn(THEMES[m].fx); if (THEMES[m].fx !== "water" && THEMES[m].fx !== "air") p.life = Math.random() * p.max * 0.8; else p.x = Math.random() * W; return p; });
    arcs = []; ripples = [];
    if (reduce) step(performance.now());
    const src = await tryImage(m);
    if (mode !== m) return;
    if (src) { imgLayer.style.backgroundImage = `url("${src}")`; world.classList.add("has-img"); }
    else { world.classList.remove("has-img"); imgLayer.style.backgroundImage = ""; }
  }

  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => {
    // phones fire resize when the address bar shows/hides; the world is sized to 100lvh so only real changes repaint
    if (Math.abs(innerWidth - W) < 2 && Math.abs(bigH() - H) < 2) return;
    size(); const m = mode; mode = null; set(m); }, 200); });
  addEventListener("pointermove", e => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  size();

  window.SCENE = { set, start, stop, mode: () => mode };
})();
