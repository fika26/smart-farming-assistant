/* Code-drawn artwork: element sigils, trial icons, gear rings, frame ornaments, drone. */
(function () {
  const TAU = Math.PI * 2;

  function gearPath(cx, cy, ro, ri, teeth, land = 0.42) {
    let d = "";
    const step = TAU / teeth;
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      const a1 = a + step * (0.5 - land / 2), a2 = a + step * (0.5 + land / 2);
      const a0 = a + step * 0.5 - step * 0.36, a3 = a + step * 0.5 + step * 0.36;
      const p = (r, t) => (cx + r * Math.cos(t)).toFixed(2) + " " + (cy + r * Math.sin(t)).toFixed(2);
      d += (i === 0 ? "M" : "L") + p(ri, a) + " L" + p(ri, a0) + " L" + p(ro, a1) + " L" + p(ro, a2) + " L" + p(ri, a3) + " ";
    }
    return d + "Z";
  }

  // Classical alchemical element symbols (+ quintessence for Ether)
  const GLYPH = {
    fire:  '<path d="M50 16 L84 76 H16 Z"/>',
    water: '<path d="M16 24 H84 L50 84 Z"/>',
    air:   '<path d="M50 16 L84 76 H16 Z"/><path d="M28 54 H72"/>',
    earth: '<path d="M16 24 H84 L50 84 Z"/><path d="M28 46 H72"/>',
    ether: '<circle cx="50" cy="50" r="32"/><circle cx="50" cy="50" r="7" class="fillc"/><path d="M50 18 V30 M50 70 V82 M18 50 H30 M70 50 H82"/>'
  };

  function glyph(id, cls = "") {
    return `<svg class="glyph ${cls}" viewBox="0 0 100 100" aria-hidden="true">${GLYPH[id]}</svg>`;
  }

  // Medallion: gear ring + element glyph
  function medallion(id, cls = "") {
    return `<svg class="medal ${cls}" viewBox="0 0 200 200" aria-hidden="true">
      <defs><radialGradient id="mg-${id}" cx="50%" cy="45%" r="60%">
        <stop offset="0" stop-color="var(--rc)" stop-opacity=".45"/><stop offset=".6" stop-color="var(--rc)" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
      <circle cx="100" cy="100" r="96" fill="url(#mg-${id})"/>
      <g class="medal-gear"><path d="${gearPath(100, 100, 92, 84, 32)}" class="m-gear"/></g>
      <circle cx="100" cy="100" r="76" class="m-ring"/>
      <circle cx="100" cy="100" r="70" class="m-ring thin"/>
      <g transform="translate(55 55) scale(.9)" class="m-glyph">${GLYPH[id]}</g>
    </svg>`;
  }

  const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";

  // The great sigil: gear rim, rune band, pentagram linking the five realms.
  function sigil(opts = {}) {
    const mono = !!opts.mono;
    const order = ["ether", "fire", "air", "water", "earth"]; // top, then clockwise
    const pts = order.map((_, i) => {
      const a = -Math.PI / 2 + i * TAU / 5;
      return [300 + 196 * Math.cos(a), 300 + 196 * Math.sin(a)];
    });
    const star = [0, 2, 4, 1, 3, 0].map(i => pts[i].map(n => n.toFixed(1)).join(" ")).join(" L");
    const runeText = (RUNES + " · " + RUNES + " · ").repeat(2);
    const nodes = order.map((id, i) => {
      const [x, y] = pts[i];
      return `<g class="sg-node" data-realm="${id}" transform="translate(${x - 26} ${y - 26}) scale(.52)" style="--rc:var(--${mono ? "ink" : id})">
        <circle cx="50" cy="50" r="46" class="sg-node-bg"/>${GLYPH[id]}</g>`;
    }).join("");
    return `<svg class="sigil ${mono ? "mono" : ""}" viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <path id="runepath${mono ? "m" : ""}" d="M300 300 m-252 0 a252 252 0 1 1 504 0 a252 252 0 1 1 -504 0"/>
        <radialGradient id="sg-core${mono ? "m" : ""}" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="${mono ? "#fff" : "#f4c66a"}" stop-opacity=".22"/>
          <stop offset=".55" stop-color="${mono ? "#fff" : "#c9a24a"}" stop-opacity=".05"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="300" cy="300" r="298" fill="url(#sg-core${mono ? "m" : ""})"/>
      <g class="sg-rot-a"><path d="${gearPath(300, 300, 292, 278, 72, 0.5)}" class="sg-gear"/></g>
      <circle cx="300" cy="300" r="270" class="sg-line"/>
      <g class="sg-rot-b"><text class="sg-runes"><textPath href="#runepath${mono ? "m" : ""}" textLength="1570">${runeText}</textPath></text></g>
      <circle cx="300" cy="300" r="236" class="sg-line"/>
      <circle cx="300" cy="300" r="228" class="sg-line thin dash"/>
      <g class="sg-rot-c">
        ${Array.from({ length: 60 }, (_, i) => { const a = i * TAU / 60, r1 = i % 5 ? 214 : 204; return `<path d="M${(300 + r1 * Math.cos(a)).toFixed(1)} ${(300 + r1 * Math.sin(a)).toFixed(1)} L${(300 + 222 * Math.cos(a)).toFixed(1)} ${(300 + 222 * Math.sin(a)).toFixed(1)}" class="sg-tick"/>`; }).join("")}
      </g>
      <path d="M${star} Z" class="sg-star"/>
      <circle cx="300" cy="300" r="196" class="sg-line thin"/>
      <circle cx="300" cy="300" r="120" class="sg-line thin dash"/>
      <g class="sg-rot-d"><path d="${gearPath(300, 300, 64, 54, 14, 0.46)}" class="sg-gear inner"/><circle cx="300" cy="300" r="26" class="sg-line"/></g>
      ${nodes}
    </svg>`;
  }

  // Trial icons — 64x64 line art
  const ICON = {
    rover: '<rect x="12" y="24" width="38" height="14" rx="3"/><path d="M50 30 h5 l3 6 v2 h-8"/><circle cx="18" cy="44" r="6"/><circle cx="32" cy="44" r="6"/><circle cx="46" cy="44" r="6"/><path d="M22 24 V14 h10 M32 14 l4 -4"/><path d="M4 54 Q20 48 32 54 T60 52"/>',
    robowars: '<path d="M20 44 h26 l8 -10 H14 Z"/><circle cx="40" cy="24" r="12"/><path d="M40 12 l3 -4 M52 24 l4 3 M40 36 l-3 4 M28 24 l-4 -3 M48.5 15.5 l4 -1 M31.5 32.5 l-4 1 M48.5 32.5 l1 4 M31.5 15.5 l-1 -4"/><circle cx="40" cy="24" r="3"/><circle cx="20" cy="48" r="4"/><circle cx="46" cy="48" r="4"/>',
    sumo: '<circle cx="32" cy="34" r="24"/><circle cx="32" cy="34" r="18" class="thin"/><path d="M14 34 h10 l-4 -4 M24 34 l-4 4"/><path d="M50 34 h-10 l4 -4 M40 34 l4 4"/><path d="M28 10 v6 M36 10 v6"/>',
    workshop: '<path d="M14 50 L36 28"/><path d="M36 28 a9 9 0 1 0 6 -15 l-5 5 l-5 -1 l-1 -5 l5 -5 a9 9 0 0 0 -15 6"/><path d="M50 50 L30 30"/><path d="M50 50 l4 4 l2 -2 l-4 -4 Z"/><path d="M26 26 l-6 -6 l-4 4 l6 6 Z"/>',
    expo: '<path d="M18 54 h28 M22 54 v-10 h20 v10"/><circle cx="32" cy="28" r="10"/><circle cx="32" cy="28" r="3"/><path d="M32 14 v-4 M32 46 v-4 M18 28 h-4 M50 28 h-4"/><path d="M8 8 l10 10 M56 8 l-10 10"/>',
    pulse: '<path d="M32 54 C10 40 8 26 14 18 a10 10 0 0 1 18 2 a10 10 0 0 1 18 -2 c6 8 4 22 -18 36 Z"/><path d="M8 34 h12 l4 -8 l6 16 l5 -12 l3 4 h18"/>',
    linebot: '<path d="M6 54 C18 54 16 34 32 34 S46 14 58 14" class="track"/><rect x="22" y="22" width="22" height="14" rx="3" transform="rotate(-20 33 29)"/><circle cx="24" cy="40" r="3.5"/><circle cx="42" cy="34" r="3.5"/><path d="M46 20 l4 -2 M47 25 l4 -1"/>',
    robothon: '<rect x="18" y="18" width="28" height="28" rx="2"/><rect x="26" y="26" width="12" height="12"/><path d="M24 18 v-8 M32 18 v-8 M40 18 v-8 M24 46 v8 M32 46 v8 M40 46 v8 M18 24 h-8 M18 32 h-8 M18 40 h-8 M46 24 h8 M46 32 h8 M46 40 h8"/>',
    drone: '<path d="M20 20 L44 44 M44 20 L20 44"/><rect x="26" y="26" width="12" height="12" rx="3"/><ellipse cx="16" cy="16" rx="9" ry="3"/><ellipse cx="48" cy="16" rx="9" ry="3"/><ellipse cx="16" cy="48" rx="9" ry="3"/><ellipse cx="48" cy="48" rx="9" ry="3"/>',
    scroll: '<path d="M18 12 h30 a6 6 0 0 1 0 12 h-4 v26 a6 6 0 0 1 -6 6 H16 a6 6 0 0 1 0 -12 h4 V18 a6 6 0 0 1 -2 -6"/><path d="M26 26 h12 M26 32 h12 M26 38 h8"/>',
    poster: '<rect x="14" y="10" width="36" height="28"/><path d="M20 30 l8 -10 l6 6 l4 -4 l6 8"/><circle cx="40" cy="18" r="3"/><path d="M20 38 L14 56 M44 38 L50 56 M32 38 v12"/>',
    quiz: '<path d="M32 6 L54 19 V45 L32 58 L10 45 V19 Z"/><path d="M25 25 a7 7 0 1 1 10 6 c-3 2 -3 3 -3 6"/><circle cx="32" cy="44" r="1.6" class="fillc"/>',
    linequest: '<path d="M4 50 C14 50 14 34 24 34 S34 46 42 40" class="track"/><circle cx="46" cy="22" r="12"/><path d="M46 22 L52 16 M46 8 v-3 M42 5 h8 M57 11 l3 -3"/><circle cx="46" cy="22" r="1.8" class="fillc"/><path d="M4 50 h10" />',
    rope: '<path d="M4 34 C16 30 24 38 32 34 S48 30 60 34"/><path d="M32 26 v16"/><circle cx="12" cy="22" r="4"/><path d="M12 26 v10 l-4 10 M12 36 l4 10 M12 30 l6 3"/><circle cx="52" cy="22" r="4"/><path d="M52 26 v10 l4 10 M52 36 l-4 10 M52 30 l-6 3"/>',
    clapper: '<path d="M10 26 H54 V54 H10 Z"/><path d="M10 26 L52 14 L54 20 L12 32"/><path d="M20 23 l6 -8 M32 20 l6 -8 M44 17 l6 -8"/><path d="M24 38 l12 6 l-12 6 Z"/>',
    connect: '<circle cx="22" cy="32" r="13"/><circle cx="42" cy="32" r="13"/><path d="M32 10 v6 M32 48 v6 M10 10 l5 5 M54 10 l-5 5"/>',
    music: '<path d="M24 46 V14 L50 8 V40"/><ellipse cx="18" cy="46" rx="6" ry="5"/><ellipse cx="44" cy="40" rx="6" ry="5"/><path d="M24 22 L50 16"/>'
  };
  function icon(id) {
    return `<svg class="ticon" viewBox="0 0 64 64" aria-hidden="true">${ICON[id] || ICON.robothon}</svg>`;
  }

  // Ornaments for frames
  const crest = `<svg class="crest" viewBox="0 0 360 40" aria-hidden="true">
    <path d="M0 30 H120 L140 14 H160 L180 2 L200 14 H220 L240 30 H360" class="cr-line"/>
    <path d="M0 34 H124 L144 20 H216 L236 34 H360" class="cr-line thin"/>
    <path d="M164 26 L180 10 L196 26 Z" class="cr-fill"/>
    <path d="M180 14 L186 20 L180 26 L174 20 Z" class="cr-gem"/>
    <path d="M8 26 h40 M312 26 h40" class="cr-hatch"/>
    <circle cx="4" cy="30" r="3" class="cr-dot"/><circle cx="356" cy="30" r="3" class="cr-dot"/>
  </svg>`;
  const foot = `<svg class="crest crest-foot" viewBox="0 0 360 24" aria-hidden="true">
    <path d="M0 6 H130 L146 18 H214 L230 6 H360" class="cr-line"/>
    <path d="M174 12 L180 6 L186 12 L180 18 Z" class="cr-gem"/>
  </svg>`;
  const corner = `<svg class="corner" viewBox="0 0 40 40" aria-hidden="true"><path d="M2 38 V12 L12 2 H38" class="cn-line"/><path d="M7 30 V14 L14 7 H30" class="cn-line thin"/><path d="M2 12 L6 8 L10 12 L6 16 Z" class="cn-gem"/></svg>`;
  function frameDeco() {
    return `${crest}<span class="corners">${corner}${corner}${corner}${corner}</span>${foot}`;
  }

  // Section divider ◆◆ title ◆◆
  function divider(text, tag = "h2", id = "") {
    return `<div class="divider"><span class="dv-line"></span><span class="dv-gems" aria-hidden="true"><i></i><i class="s"></i></span>
      <${tag} class="dv-title"${id ? ` id="${id}"` : ""}>${text}</${tag}>
      <span class="dv-gems r" aria-hidden="true"><i class="s"></i><i></i></span><span class="dv-line"></span></div>`;
  }

  const drone = `<svg viewBox="0 0 160 110" class="drone-svg">
    <defs>
      <linearGradient id="dr-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3efe6"/><stop offset="1" stop-color="#9a958b"/></linearGradient>
      <radialGradient id="dr-eye" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="var(--drone-eye,#7fe3ff)"/><stop offset="1" stop-color="var(--drone-eye,#7fe3ff)" stop-opacity="0"/></radialGradient>
    </defs>
    <g class="dr-glow"><ellipse cx="80" cy="104" rx="30" ry="4" fill="var(--drone-eye,#7fe3ff)" opacity=".25"/></g>
    <g class="dr-arms" stroke="#2a2a30" stroke-width="5" stroke-linecap="round" fill="none"><path d="M58 50 L22 30"/><path d="M102 50 L138 30"/></g>
    <g class="dr-motor"><rect x="14" y="24" width="16" height="10" rx="3" fill="#3a3a42"/><rect x="130" y="24" width="16" height="10" rx="3" fill="#3a3a42"/></g>
    <g class="rotor l"><ellipse cx="22" cy="22" rx="20" ry="3" fill="#cfd8e0" opacity=".55"/></g>
    <g class="rotor r"><ellipse cx="138" cy="22" rx="20" ry="3" fill="#cfd8e0" opacity=".55"/></g>
    <path d="M80 18 V8" stroke="#2a2a30" stroke-width="3" stroke-linecap="round"/><circle cx="80" cy="7" r="3.5" class="dr-tip" fill="var(--drone-eye,#7fe3ff)"/>
    <rect x="48" y="18" width="64" height="56" rx="24" fill="url(#dr-body)" stroke="#2a2a30" stroke-width="3"/>
    <rect x="56" y="32" width="48" height="24" rx="12" fill="#101218" stroke="#2a2a30" stroke-width="2"/>
    <g class="dr-eyes"><ellipse cx="72" cy="44" rx="5" ry="6" fill="url(#dr-eye)"/><ellipse cx="88" cy="44" rx="5" ry="6" fill="url(#dr-eye)"/></g>
    <path d="M62 74 L56 86 M98 74 L104 86" stroke="#2a2a30" stroke-width="3" stroke-linecap="round"/>
    <path d="M52 86 h10 M98 86 h10" stroke="#2a2a30" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

  window.ART = { gearPath, glyph, medallion, sigil, icon, frameDeco, divider, drone, RUNES };
})();
