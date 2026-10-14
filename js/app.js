/* App shell: gate, router, views, HUD, drone mascot. */
(function () {
  const T = window.TV, A = window.ART;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const view = $("#view");
  const REALM = Object.fromEntries(T.realms.map(r => [r.id, r]));
  const TRIAL = Object.fromEntries(T.trials.map(t => [t.id, t]));
  const trialsOf = id => T.trials.filter(t => t.realm === id);
  const rc = id => `--rc:var(--${id})`;
  const soon = (txt = "Coming soon") => `<span class="soon">${txt}</span>`;
  const val = v => v ? esc(v) : soon();
  const ext = url => `href="${esc(url)}" target="_blank" rel="noopener"`;
  let timers = [];
  const phone = (n, cls = "phone") => n ? `<a class="${cls}" href="tel:${n.replace(/\s/g, "")}">${esc(n)}</a>` : "";

  /* ---------- shared pieces ---------- */
  const formOf = t => t.noReg ? "" : (t.form || T.forms.register || "");
  function regBtn(t, short) {
    if (t.noReg) return `<span class="btn" aria-disabled="true">Walk in</span>`;
    const link = formOf(t);
    return link
      ? `<a class="btn solid" ${ext(link)}>${short ? "Register" : "Register now"} <span class="arr">↗</span></a>`
      : `<span class="btn" aria-disabled="true" title="Registration form opens soon">${short ? "Opens soon" : "Registration opens soon"}</span>`;
  }
  function card(t) {
    const r = REALM[t.realm];
    return `<article class="frame tcard${t.prize ? "" : " no-bar"}" style="${rc(t.realm)}">${A.frameDeco()}
      <div class="tc-art"><svg class="tc-gear" viewBox="0 0 200 200" aria-hidden="true"><path d="${A.gearPath(100, 100, 98, 88, 30)}"/><circle cx="100" cy="100" r="70" fill="none" stroke="currentColor"/></svg>${A.icon(t.icon)}
        <img src="assets/trials/${t.id}.webp" alt="" loading="lazy" onerror="this.remove()"></div>
      <div class="tc-tags"><span class="tag realm">${A.glyph(r.id)}${r.name}</span><span class="tag">${t.type}</span></div>
      <h3 class="tc-name">${esc(t.name)}</h3>
      ${t.time ? `<p class="tc-when">${esc(t.time)}</p>` : ""}
      <p class="tc-desc">${esc(t.tagline || t.desc)}</p>
      <div class="tc-btns"><a class="btn" href="#t-${t.id}">Explore</a>${regBtn(t, true)}</div>
      ${t.prize ? `<div class="tc-bar"><span>Prize pool</span><em>${esc(t.prize)}</em></div>` : ""}
    </article>`;
  }
  function path(items) {
    return `<ol class="path">${items.map((s, i) => `<li class="${s.lit ? "lit" : ""} ${s.sealed ? "sealed" : ""}">
      <span class="wp" aria-hidden="true"><i><b>${s.mark ?? i + 1}</b></i></span>
      <div class="step"><h3>${esc(s.t)}</h3>${s.when !== undefined ? `<p class="when">${s.when ? esc(s.when) : soon()}</p>` : ""}${s.p ? `<p>${esc(s.p)}</p>` : ""}</div></li>`).join("")}</ol>`;
  }
  function festPath() {
    return path(T.festRoadmap.map(s => ({ t: s.t, when: s.d, p: s.note, lit: !!s.d, sealed: !s.d })));
  }
  function ring() {
    const order = T.realms;
    const pos = order.map((r, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; return [50 + 38 * Math.cos(a), 50 + 38 * Math.sin(a)]; });
    const star = [0, 2, 4, 1, 3, 0].map(i => pos[i].map(n => (n * 6).toFixed(1)).join(" ")).join(" L");
    return `<div class="ring" id="ring" style="${rc("gold")}">
      <svg class="ring-svg" viewBox="0 0 600 600" aria-hidden="true">
        <circle cx="300" cy="300" r="228" stroke-width="1"/><circle cx="300" cy="300" r="240" stroke-width=".6" stroke-dasharray="2 6"/>
        <path d="M${star} Z" fill="none" stroke="var(--gold)" stroke-opacity=".28"/>
      </svg>
      <div class="ring-core" aria-live="polite">
        <p class="kicker">Choose your realm</p>
        <p class="rc-name">Five Realms</p>
        <p class="rc-pillar">One discipline in each</p>
        <p class="rc-line">Mechatronics is built from five disciplines. Each realm holds one, and its trials.</p>
      </div>
      ${order.map((r, i) => `<a class="realm-node" href="#${r.id}" data-realm="${r.id}" style="left:${pos[i][0]}%;top:${pos[i][1]}%;${rc(r.id)}">
        ${A.medallion(r.id)}<span class="rn-label">${r.name}<small>${r.pillar}</small></span></a>`).join("")}
    </div>`;
  }
  function bindRing(baseMode) {
    const el = $("#ring"); if (!el) return;
    const core = $(".ring-core", el), def = core.innerHTML;
    let tm;
    const show = id => {
      const r = REALM[id];
      el.style.cssText = rc(id);
      $$(".realm-node", el).forEach(n => n.classList.toggle("on", n.dataset.realm === id));
      core.innerHTML = `<p class="kicker">${esc(r.sanskrit)} · ${esc(r.epithet)}</p><p class="rc-name">${r.name}</p><p class="rc-pillar">${esc(r.pillar)}</p><p class="rc-line">${esc(r.line)}</p><p class="rc-count">${trialsOf(id).length} ${trialsOf(id).length === 1 ? "trial" : "trials"} · Enter ›</p>`;
      clearTimeout(tm); tm = setTimeout(() => { SCENE.set(id); AUDIO.setRealm(id); }, 120);
    };
    // Hover preview is mouse/keyboard only: on touch, pointerenter fires on the tap itself, and swapping the
    // core text made the whole list jump under the finger (missed/mis-routed taps).
    $$(".realm-node", el).forEach(n => {
      n.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") show(n.dataset.realm); });
      n.addEventListener("focus", () => { if (n.matches(":focus-visible")) show(n.dataset.realm); });
    });
    el.addEventListener("pointerleave", () => { clearTimeout(tm); tm = setTimeout(() => { el.style.cssText = rc("gold"); core.innerHTML = def; $$(".realm-node", el).forEach(n => n.classList.remove("on")); SCENE.set(baseMode); AUDIO.setRealm(baseMode); }, 500); });
  }
  const footer = () => `<footer class="foot">
      <img src="assets/logo-white.webp" alt="Technovation '26">
      <nav aria-label="Footer">${["realms", "trials", "chronicle", "rules", "map", "guild", "patrons", "contact"].map(k => `<a href="#${k}">${k}</a>`).join("")}</nav>
      <small>${esc(T.fest.dept)} · ${esc(T.fest.college)}, ${esc(T.fest.place)}<br>${esc(T.fest.dates)}</small>
      <a class="btn" ${ext(T.mapUrl)}>Get directions to MGIT <span class="arr">↗</span></a>
      <small class="legal">© 2026 Technovation · ${esc(T.fest.dept)}, ${esc(T.fest.collegeShort)}</small>
    </footer>`;
  const counter = () => `<div class="count" id="count" role="timer" aria-label="Countdown to Day 1">
      <div><b data-k="d">--</b><span>Days</span></div><div><b data-k="h">--</b><span>Hours</span></div>
      <div><b data-k="m">--</b><span>Minutes</span></div><div><b data-k="s">--</b><span>Seconds</span></div></div>
      ${T.fest.startLabel ? `<p class="count-when" id="count-when">${esc(T.fest.startLabel)}</p>` : ""}`;
  function tick() {
    const el = $("#count"); if (!el) return;
    const diff = new Date(T.fest.startsAt) - Date.now();
    if (diff <= 0) {
      const over = T.fest.endsAt && Date.now() > new Date(T.fest.endsAt);
      const k = el.parentElement.querySelector(".kicker"); if (k) k.textContent = over ? "Technovation ’26" : "Technovation is live";
      const w = $("#count-when"); if (w) w.remove();
      el.outerHTML = `<p class="dv-title">${over ? "Thank you for being part of it" : "The gates are open"}</p>`; return;
    }
    const v = { d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, s: Math.floor(diff / 1e3) % 60 };
    $$("b", el).forEach(b => b.textContent = String(v[b.dataset.k]).padStart(2, "0"));
  }

  /* ---------- views ---------- */
  const V = {};
  V.home = () => `
    <section class="hero">
      <div class="hero-sigil">${A.sigil()}</div>
      <div class="hero-inner">
        <p class="hero-eyebrow">${esc(T.fest.dept)} · ${esc(T.fest.collegeShort)} presents</p>
        <h1 class="sr">Technovation ’26 — The Five Realms</h1>
        <img class="hero-logo" src="assets/logo-white.webp" alt="Technovation ’26 — Mechatronics">
        <p class="hero-kick" aria-hidden="true">The 2026 theme</p><p class="hero-title" aria-hidden="true">The Five Realms</p>
        <p class="hero-meta"><span>${esc(T.fest.dates)}</span><i class="dot"></i><a class="hero-loc" ${ext(T.mapUrl)} title="Open in Google Maps">${esc(T.fest.collegeShort)} · ${esc(T.fest.place)} <span class="arr">↗</span></a></p>
        <div class="btn-row" style="justify-content:center;margin-top:10px">
          <a class="btn solid" href="#trials">View the trials</a><a class="btn" href="#realms">Choose your realm</a>
        </div>
      </div>
      <button class="scroll-cue" id="cue" style="background:none;border:0;cursor:pointer">SCROLL<i></i></button>
    </section>
    <div class="wrap">
      <section class="sec" id="s-count" style="padding-top:20px">
        <div class="frame count-wrap">${A.frameDeco()}<p class="kicker">Day 1 begins in</p>${counter()}<p class="lede" style="text-align:center">${esc(T.fest.blurb)}</p></div>
      </section>
      <section class="sec">${A.divider("The Five Realms")}${ring()}</section>
      <section class="sec">${A.divider("What awaits")}
        <div class="pillars">${T.pillars.map((p, i) => `<div class="frame pillar">${A.frameDeco()}<span class="pi">${A.icon(["robowars", "workshop", "expo", "connect"][i])}</span><h3>${esc(p.k)}</h3><p>${esc(p.d)}</p></div>`).join("")}</div>
      </section>
      ${T.forms.register ? `<section class="sec">${A.divider("Registrations open")}${regPanel()}</section>` : ""}
      <section class="sec">${A.divider("The Path")}
        <div class="frame" style="${rc("gold")}">${A.frameDeco()}${festPath()}</div>
      </section>
      <section class="sec">${A.divider("Who we are")}
        <div class="about">
          <div class="frame">${A.frameDeco()}<p class="kicker">The college</p><h3>${esc(T.fest.college)}</h3><p>${esc(T.about.mgit)}</p></div>
          <div class="frame">${A.frameDeco()}<p class="kicker">The department</p><h3>${esc(T.fest.dept)}</h3><p>${esc(T.about.dept)}</p></div>
        </div>
        <div class="stats">${T.about.stats.map(s => `<div class="stat"><b>${esc(s.v)}</b><span>${esc(s.k)}</span></div>`).join("")}</div>
        <div class="tenets">${[["Vision", T.about.vision], ["Mission", T.about.mission], ["Values", T.about.values], ["Impact", T.about.impact]].map(([k, v]) => `<div class="tenet"><h4>${k}</h4><p>${esc(v)}</p></div>`).join("")}</div>
      </section>
      <section class="sec">
        <div class="callouts">
          <div class="frame callout" style="${rc("fire")}">${A.frameDeco()}<p class="kicker" style="color:var(--fire)">MGIT students</p><h3>Join the Guild</h3><p>Volunteer at Technovation and help run the trials across both days. Open to MGIT students.</p><div class="btn-row"><a class="btn" href="#guild">Volunteer</a></div></div>
          <div class="frame callout" style="${rc("earth")}">${A.frameDeco()}<p class="kicker" style="color:var(--earth)">Sponsors</p><h3>Become a Patron</h3><p>Our patrons will be announced soon. Partner with Technovation and put your brand in front of students who build machines.</p><div class="btn-row"><a class="btn" href="#patrons">Sponsor us</a></div></div>
        </div>
      </section>
    </div>${footer()}`;

  V.realms = () => `
    <section class="realm-hero" style="${rc("gold")}">
      <p class="kicker">Mechatronics, in five parts</p>
      <h1 class="realm-title" style="font-size:clamp(2.6rem,9vw,7rem)">The Five Realms</h1>
      <p class="realm-line">Every machine at Technovation draws on five disciplines. Each realm holds one, and its trials.</p>
    </section>
    <div class="wrap"><section class="sec" style="padding-top:20px">${ring()}</section>
      <section class="sec" style="padding-top:0"><div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))">
        ${T.realms.map(r => `<article class="frame tcard" style="${rc(r.id)}">${A.frameDeco()}
          <div class="tc-art"><div style="width:58%;aspect-ratio:1">${A.medallion(r.id)}</div></div>
          <div class="tc-tags"><span class="tag">${esc(r.sanskrit)}</span><span class="tag">${trialsOf(r.id).length} ${trialsOf(r.id).length === 1 ? "trial" : "trials"}</span></div>
          <h3 class="tc-name">${r.name} · ${esc(r.pillar)}</h3><p class="tc-desc">${esc(r.line)}</p>
          <div class="tc-btns" style="grid-template-columns:1fr"><a class="btn solid" href="#${r.id}">Enter ${r.name}</a></div>
          <div class="tc-bar"><span>${esc(r.epithet)}</span></div></article>`).join("")}
      </div></section></div>${footer()}`;

  V.realm = id => {
    const r = REALM[id], i = T.realms.indexOf(r), prev = T.realms[(i + 4) % 5], next = T.realms[(i + 1) % 5];
    return `<div style="${rc(id)}">
      <section class="realm-hero">
        <div class="rh-medal">${A.medallion(id)}</div>
        <p class="realm-sub">${esc(r.sanskrit)} · ${esc(r.epithet)}</p>
        <h1 class="realm-title">${r.name}</h1>
        <p class="realm-pillar">${esc(r.pillar)}</p>
        <p class="realm-line">${esc(r.line)}</p>
      </section>
      <div class="wrap"><section class="sec">${A.divider(`Trials of ${r.name}`)}<div class="cards">${trialsOf(id).map(card).join("")}</div></section>
        <nav class="realm-nav" aria-label="Other realms"><a class="btn" href="#${prev.id}" style="${rc(prev.id)}">‹ ${prev.name}</a><a class="btn" href="#${next.id}" style="${rc(next.id)}">${next.name} ›</a></nav>
      </div></div>${footer()}`;
  };

  let filter = { type: "all", realm: "all" };
  V.trials = () => `
    <section class="realm-hero" style="${rc("gold")}">
      <p class="kicker">${T.trials.length} trials across five realms</p>
      <h1 class="realm-title" style="font-size:clamp(3rem,11vw,8rem)">The Trials</h1>
      <p class="realm-line">Technical and non-technical events for builders, pilots and thinkers. Registrations are open, and one form covers every event. Timings will be announced soon.</p>
    </section>
    <div class="wrap"><section class="sec" style="padding-top:20px">
      <div class="filters" role="group" aria-label="Filter by type">${["all", "Technical", "Non-technical"].map(k => `<button class="chip" data-f="type" data-v="${k}" aria-pressed="${filter.type === k}">${k === "all" ? "All trials" : k}<span class="n"></span></button>`).join("")}</div>
      <div class="filters" role="group" aria-label="Filter by realm"><button class="chip" data-f="realm" data-v="all" aria-pressed="${filter.realm === "all"}">All realms<span class="n"></span></button>${T.realms.map(r => `<button class="chip" style="${rc(r.id)}" data-f="realm" data-v="${r.id}" aria-pressed="${filter.realm === r.id}">${A.glyph(r.id)}${r.name}<span class="n"></span></button>`).join("")}</div>
      <p class="result-count" id="trial-count" aria-live="polite"></p>
      <div class="cards" id="trial-grid"></div>
    </section></div>${footer()}`;
  const match = (t, f) => (f.type === "all" || t.type === f.type) && (f.realm === "all" || t.realm === f.realm);
  function drawTrials() {
    const g = $("#trial-grid"); if (!g) return;
    const list = T.trials.filter(t => match(t, filter));
    // each chip shows how many trials you'd get if you picked it, given the OTHER filter; empty combos are dimmed
    $$(".chip").forEach(c => {
      const f = c.dataset.f, v = c.dataset.v, n = T.trials.filter(t => match(t, { ...filter, [f]: v })).length;
      c.setAttribute("aria-pressed", filter[f] === v); c.classList.toggle("empty", n === 0 && v !== "all");
      const el = $(".n", c); if (el) el.textContent = n;
    });
    const label = { all: "", Technical: "technical ", "Non-technical": "non-technical " }[filter.type] || "";
    g.innerHTML = list.length ? list.map(card).join("") : `<div class="empty-state"><p class="lede">No ${label}trials in ${filter.realm === "all" ? "any realm" : REALM[filter.realm].name} yet.</p><button class="btn" id="reset-filters">Show all trials</button></div>`;
    const rb = $("#reset-filters"); if (rb) rb.onclick = () => { filter = { type: "all", realm: "all" }; drawTrials(); };
    const c = $("#trial-count"); if (c) c.textContent = `Showing ${list.length} of ${T.trials.length} trials`;
  }

  function regPanel() {
    return `<div class="frame reg-panel" style="${rc("gold")}">${A.frameDeco()}
      <div class="qr"><img src="assets/register-qr.svg" alt="QR code for the Technovation registration form" width="180" height="180"></div>
      <div class="reg-copy"><p class="kicker">One form for every trial</p><h3>Scan to register</h3>
        <p>Pick your events in a single Google Form. All trials are paid, and registration is confirmed once your fee is paid.</p>
        <div class="btn-row"><a class="btn solid" ${ext(T.forms.register)}>Open the form <span class="arr">↗</span></a><a class="btn" href="#trials">See all trials</a></div>${T.registrationTeam && T.registrationTeam.length ? `<p class="reg-desk">Help desk: ${T.registrationTeam.map(c => `${esc(c.name)} ${phone(c.phone)}`).join(" · ")}</p>` : ""}</div>
    </div>`;
  }
  function rulebook(t) {
    if (t.rules === null) {
      if (t.noReg) return "";
      return `<div class="frame rulebook">${A.frameDeco()}<p class="kicker" style="color:var(--rc)">Rules</p><p style="color:var(--parch-dim);margin-top:10px">No rulebook for this one. The coordinators explain the format on the spot.</p></div>`;
    }
    const secs = t.rules || [];
    if (!secs.length && !t.scoring) return `<div class="frame rulebook">${A.frameDeco()}<p class="kicker" style="color:var(--rc)">Rulebook</p><p style="color:var(--parch-dim);margin-top:10px">The rulebook for this trial will be published here soon.</p></div>`;
    const table = (title, rows, total, note) => `<div class="score"><p class="score-title">${esc(title)}</p><table><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`).join("")}${total ? `<tr class="total"><td>Total</td><td>${total}</td></tr>` : ""}</tbody></table>${note ? `<p class="score-note">${esc(note)}</p>` : ""}</div>`;
    const sum = rows => rows.every(r => typeof r[1] === "number") ? rows.reduce((n, r) => n + r[1], 0) : 0;
    const side = (t.glance ? table(t.glance.title, t.glance.rows) : "") + (t.scoring ? table(t.scoring.title, t.scoring.rows, sum(t.scoring.rows), t.scoring.note) : "") + (t.penalties ? table("Penalties", t.penalties) : "");
    return `<div class="frame rulebook">${A.frameDeco()}
      <p class="kicker" style="color:var(--rc)">Rulebook</p>
      <div class="rb-grid${side ? "" : " solo"}">
        <div class="rb-secs">${secs.map((sec, i) => `<details class="rb-sec"${i === 0 ? " open" : ""}><summary><span class="rb-n"><b>${i + 1}</b></span>${esc(sec.h)}</summary><ul>${sec.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>`).join("")}</div>
        ${side ? `<div class="rb-side">${side}</div>` : ""}
      </div>
      <p class="rb-foot">Organizers may update rules or timings, with an announcement. The coordinators’ decisions are final.</p>
    </div>`;
  }
  function problemsPanel() {
    const P = window.TV_PROBLEMS, doms = [...new Set(P.map(x => x.d))];
    return `<div class="frame problems" id="problems">${A.frameDeco()}
      <p class="kicker" style="color:var(--rc)">Problem statements · ${P.length} challenges</p>
      <p style="color:var(--parch-dim);margin:8px 0 16px">Pick one, or go open innovation with your own robotics idea. Tap a challenge to see the details.</p>
      <div class="filters ps-filters" role="group" aria-label="Filter by domain"><button class="chip ps-chip" data-d="all" aria-pressed="true">All (${P.length})</button>${doms.map(d => `<button class="chip ps-chip" data-d="${esc(d)}" aria-pressed="false">${esc(d)} (${P.filter(x => x.d === d).length})</button>`).join("")}</div>
      <div class="ps-list">${P.map((x, i) => `<details class="rb-sec ps" data-d="${esc(x.d)}"><summary><span class="rb-n"><b>${i + 1}</b></span><span class="ps-t">${esc(x.t)}<small>${esc(x.d)}</small></span></summary>
        <dl><dt>Problem</dt><dd>${esc(x.problem)}</dd><dt>Expected outcome</dt><dd>${esc(x.outcome)}</dd><dt>Can’t do</dt><dd>${esc(x.cant)}</dd><dt>Graded on</dt><dd>${esc(x.graded)}</dd></dl></details>`).join("")}</div>
    </div>`;
  }
  document.addEventListener("click", e => {
    const sc = e.target.closest("[data-scroll]"); if (sc) { const el = document.getElementById(sc.dataset.scroll); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const c = e.target.closest(".ps-chip"); if (!c) return;
    const d = c.dataset.d;
    $$(".ps-chip").forEach(x => x.setAttribute("aria-pressed", x === c));
    $$(".ps").forEach(x => x.hidden = d !== "all" && x.dataset.d !== d);
  });
  V.trial = id => {
    const t = TRIAL[id], r = REALM[t.realm];
    const others = trialsOf(t.realm).filter(x => x.id !== id);
    const flow = t.flow && t.flow.length
      ? `<div class="days">${t.flow.map(d => `<div><p class="day-head">${esc(d.day)}</p>${path(d.steps.map(s => ({ t: s, lit: true })))}</div>`).join("")}</div><p class="lede" style="margin-top:22px;font-size:1rem">Exact timings coming soon.</p>`
      : t.road && t.road.length
        ? path(t.road.map(s => ({ t: s.t, p: s.p, lit: true })))
        : path([
          { t: "Register", p: formOf(t) ? "Registration is open. Use the button to sign up." : "This is a paid event. The registration form opens soon.", lit: !!formOf(t), sealed: !formOf(t) },
          { t: "The Trial", p: "Rounds and format will be revealed soon.", sealed: true, mark: "?" },
          { t: "Results", p: "Winners announced at Technovation.", sealed: true, when: "", mark: "?" }
        ]);
    const coords = t.coords && t.coords.length
      ? `<ul class="coords">${t.coords.map(c => `<li><span>${esc(c.name)}</span>${phone(c.phone)}</li>`).join("")}</ul>`
      : `<p style="color:var(--parch-dim)">Reach the convenors on the <a href="#contact" style="color:var(--rc)">contact page</a>.</p>`;
    const facts = [["When", t.time], ["Venue", t.venue], ["Entry fee", t.fee], ["Team size", t.team], ["Prize pool", t.prize]].filter(f => f[1]);
    return `<div class="wrap" style="${rc(t.realm)}">
      <p class="crumbs"><a href="#trials">Trials</a><span>›</span><a href="#${r.id}">${r.name}</a><span>›</span><span>${esc(t.name)}</span></p>
      <section class="sec" style="padding-top:30px">
        <div class="trial-head">
          ${t.poster ? `<a class="trial-poster" href="assets/posters/${t.id}.webp" target="_blank" rel="noopener" title="Open the official poster"><img src="assets/posters/${t.id}.webp" alt="Official ${esc(t.name)} poster" loading="lazy"><span>View poster ↗</span></a>` : `<div class="trial-emblem">${A.medallion(t.realm)}${A.icon(t.icon)}</div>`}
          <div>
            <div class="tc-tags"><span class="tag realm">${A.glyph(r.id)}${r.name} · ${esc(r.pillar)}</span><span class="tag">${t.type}</span><span class="tag">${t.noReg ? "Walk-in" : "Paid event"}</span>${t.partner ? `<span class="tag">${esc(t.partner)}</span>` : ""}</div>
            <h1 class="trial-name">${esc(t.name)}</h1>
            ${t.tagline ? `<p class="trial-tagline">${esc(t.tagline)}</p>` : ""}
            ${t.theme ? `<p class="trial-theme"><span>Theme</span>${esc(t.theme)}</p>` : ""}
            <p class="lede">${esc(t.theme ? t.desc.replace(/^Theme:[^.]*\.\s*/, "") : t.desc)}</p>
            <div class="btn-row" style="margin-top:20px">${regBtn(t)}${t.problems ? `<button class="btn" data-scroll="problems">Problem statements</button>` : ""}<a class="btn" href="#${r.id}">Back to ${r.name}</a></div>
          </div>
        </div>
        ${facts.length ? `<div class="facts">${facts.map(([k, v]) => `<div class="fact"><span>${k}</span><b>${esc(v)}</b></div>`).join("")}</div>` : ""}
        <p class="facts-map">All venues are on the MGIT campus, Gandipet. <a href="#map">Campus map</a> · <a ${ext(T.mapUrl)}>Directions <span class="arr">↗</span></a></p>
        <div class="trial-grid">
          <div class="frame">${A.frameDeco()}<p class="kicker" style="color:var(--rc);margin-bottom:22px">${t.noReg ? "What to expect" : "Trial roadmap"}</p>${flow}</div>
          <div class="frame side">${A.frameDeco()}
            ${t.noReg ? `<p class="kicker" style="color:var(--rc);margin-bottom:10px">Entry</p><p style="color:var(--parch-dim)">No registration needed. Just walk in.</p>`
              : formOf(t) ? `<p class="kicker" style="color:var(--rc);margin-bottom:14px">Register</p><div class="side-reg"><div class="qr sm"><img src="assets/register-qr.svg" alt="QR code for the registration form" width="120" height="120"></div><div><p style="color:var(--parch-dim);margin-bottom:12px">One form for every event. Scan the code or tap below.</p>${regBtn(t, true)}</div></div>`
              : ""}
            <p class="kicker" style="color:var(--rc);margin:28px 0 14px">${t.noReg ? "Coordinators" : "Student coordinators"}</p>${coords}
          </div>
        </div>
        ${rulebook(t)}
        ${t.problems && window.TV_PROBLEMS ? problemsPanel() : ""}
      </section>
      ${others.length ? `<section class="sec" style="padding-top:0">${A.divider(`More from ${r.name}`, "h2")}<div class="cards">${others.map(card).join("")}</div></section>` : ""}
    </div>${footer()}`;
  };

  V.chronicle = () => {
    const day = d => T.trials.filter(t => t.days && t.days.includes(d));
    const tbc = T.trials.filter(t => !t.days || !t.days.length);
    const row = t => `<li><a href="#t-${t.id}" style="${rc(t.realm)}"><i></i><span>${esc(t.name)}</span><small>${esc([(t.time || "").includes("·") ? t.time.split("·").pop().trim() : "", t.venue].filter(Boolean).join(" · "))}</small></a></li>`;
    return `<section class="realm-hero" style="${rc("ether")}">
      <p class="kicker" style="color:var(--ether)">Two days at MGIT</p>
      <h1 class="realm-title" style="font-size:clamp(2.8rem,10vw,7.5rem)">The Chronicle</h1>
      <p class="realm-line">Both days run 9 AM to 4 PM. Report at 9 AM in front of B Block. Most trials begin at 11 AM.</p>
    </section>
    <div class="wrap" style="${rc("gold")}">
      <section class="sec" style="padding-top:20px">${A.divider("The two days")}
        <div class="days">${[[16, "Day 1", "Friday, 16 October"], [17, "Day 2", "Saturday, 17 October"]].map(([d, n, date]) => `<div class="frame">${A.frameDeco()}
          <p class="day-head">${n}<small style="font:600 .8rem var(--f-hud);letter-spacing:.16em;color:var(--parch-dim)">${date}</small></p>
          <ul class="sched">${day(d).map(row).join("")}</ul></div>`).join("")}</div>
        ${tbc.length ? `<p class="lede" style="text-align:center;font-size:1rem">Day and time to be announced: ${tbc.map(t => `<a href="#t-${t.id}" style="color:var(--gold-hi)">${esc(t.name)}</a>`).join(", ")}.</p>` : ""}
      </section>
      <section class="sec" style="padding-top:0">${A.divider("The Path")}<div class="frame">${A.frameDeco()}${festPath()}</div></section>
    </div>${footer()}`;
  };

  V.map = () => `
    <section class="realm-hero" style="${rc("gold")}">
      <p class="kicker">Find your way</p>
      <h1 class="realm-title" style="font-size:clamp(2.8rem,10vw,7.5rem)">Campus Map</h1>
      <p class="realm-line">Enter from the main road and follow the walkway. Most trials are at B Block.</p>
    </section>
    <div class="wrap" style="${rc("gold")}">
      <section class="sec" style="padding-top:20px">
        <a class="frame map-frame" href="assets/campus-map.webp" target="_blank" rel="noopener" title="Open the full-size map">${A.frameDeco()}<img src="assets/campus-map.webp" alt="Satellite map of the MGIT campus with numbered buildings: 1 entrance walkway, 2 parking, 3 A Block, 4 Retreat, 5 B Block, 6 F Block, 7 C Block, 8 D Block, 9 E Block, 10 Central Workshops, 11 and 12 basketball courts, 13 cricket ground, 14 civil labs."><span>Tap to open full size ↗</span></a>
        ${A.divider("Where each trial happens")}
        <div class="venues">${T.mapVenues.map(v => `<div class="frame venue-card">${A.frameDeco()}<p class="venue-n"><b>${v.n}</b></p><h3>${esc(v.place)}</h3>
          <ul>${v.events.filter(id => TRIAL[id]).map(id => { const t = TRIAL[id]; return `<li><a href="#t-${t.id}" style="${rc(t.realm)}"><i></i>${esc(t.name)}${t.venue && t.venue !== v.place && !/front|opposite/i.test(v.place) ? ` <small>${esc(t.venue)}</small>` : ""}</a></li>`; }).join("")}</ul></div>`).join("")}</div>
        <div class="btn-row" style="justify-content:center"><a class="btn solid" ${ext(T.mapUrl)}>Directions to MGIT <span class="arr">↗</span></a></div>
        <p class="rb-foot" style="text-align:center">Satellite imagery © Google</p>
      </section>
    </div>${footer()}`;

  V.rules = () => `
    <section class="realm-hero" style="${rc("earth")}">
      <p class="kicker" style="color:var(--earth)">Know before you come</p>
      <h1 class="realm-title" style="font-size:clamp(2.8rem,10vw,7.5rem)">General Rules</h1>
      <p class="realm-line">For every participant, across all trials. Both days run 9 AM to 4 PM.</p>
    </section>
    <div class="wrap" style="${rc("gold")}">
      <section class="sec" style="padding-top:20px">
        <div class="frame rulebook">${A.frameDeco()}
          <div class="rb-secs">${(T.generalRules || []).map((sec, i) => `<details class="rb-sec" open><summary><span class="rb-n"><b>${i + 1}</b></span>${esc(sec.h)}</summary><ul>${sec.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>`).join("")}</div>
          <p class="rb-foot">Each trial also has its own rulebook on its page.</p>
        </div>
        <div class="btn-row" style="justify-content:center"><a class="btn solid" href="#map">Campus map</a><a class="btn" ${ext(T.forms.register)}>Register <span class="arr">↗</span></a></div>
      </section>
      ${T.registrationTeam && T.registrationTeam.length ? `<section class="sec" style="padding-top:0">${A.divider("Help desk")}<p class="lede" style="text-align:center;font-size:1rem">Questions about registration, buses or anything else? Call the help desk.</p><div class="people people-row">${T.registrationTeam.map(c => `<div class="frame person">${A.frameDeco()}<p class="role">Help desk</p><h3>${esc(c.name)}</h3>${phone(c.phone)}</div>`).join("")}</div></section>` : ""}
    </div>${footer()}`;

  V.guild = () => `
    <section class="realm-hero" style="${rc("fire")}">
      <div class="rh-medal">${A.medallion("fire")}</div>
      <p class="realm-sub">For MGIT students</p>
      <h1 class="realm-title" style="font-size:clamp(2.6rem,10vw,7.5rem)">Join the Guild</h1>
      <p class="realm-line">Volunteer at Technovation and help bring the five realms to life across both days. Volunteering is open to MGIT students only.</p>
      <div class="btn-row" style="justify-content:center;margin-top:10px">${T.forms.volunteer ? `<a class="btn solid" ${ext(T.forms.volunteer)}>Volunteer now <span class="arr">↗</span></a>` : `<span class="btn" aria-disabled="true">Volunteer form opens soon</span>`}</div>
    </section>
    <div class="wrap" style="${rc("fire")}"><section class="sec">
      <div class="frame" style="text-align:center;display:grid;gap:14px;justify-items:center">${A.frameDeco()}<p class="kicker" style="color:var(--fire)">How it works</p>
        <p style="color:var(--parch-dim);max-width:56ch">Fill in the volunteer form once it opens. The organising team will reach out with roles and timings. For questions, contact the student convenors.</p>
        <div class="btn-row" style="justify-content:center"><a class="btn" href="#contact">Contact the convenors</a></div></div>
    </section></div>${footer()}`;

  const PERKS = [
    ["Tech audience", "Students passionate about robotics and emerging tech."],
    ["Wide reach", "Promotion across online and offline channels."],
    ["Venue branding", "Your logo placed where the crowd gathers, and stickers on t-shirts."],
    ["Social shoutout", "Instagram tags for your brand."],
    ["Video credit", "An MC-recorded intro video that names you."],
    ["Website feature", "A named sponsor spot with a short write-up."],
    ["Branding proof", "Photos and videos of your logo in action."],
    ["Custom tie-ups", "Run a stall, or host your own workshop or event."]
  ];
  const TIERS = [["Diamond", "#cfefff", "Top tier, split between two sponsors: Title and Co-Title."], ["Platinum", "#cbd3dc", "Elevated cash tier with fuller visibility."], ["Gold", "#e3b84f", "Cash sponsorship, entry tier."], ["Ruby", "#e0245e", "In-kind. Runs a full workshop at no cost."], ["Emerald", "#2ecc8f", "In-kind. Provides hardware and components, and runs a discounted stall for students."]];
  V.patrons = () => {
    const lead = T.contacts.flat().find(c => /spons/i.test(c.role));
    return `<section class="realm-hero" style="${rc("earth")}">
      <p class="realm-sub">Sponsors</p>
      <h1 class="realm-title" style="font-size:clamp(3rem,11vw,8rem)">Patrons</h1>
      <p class="realm-line">${T.sponsors.length ? "The patrons who make Technovation possible." : "Our patrons will be revealed soon."}</p>
    </section>
    <div class="wrap" style="${rc("gold")}">
      ${T.sponsors.length ? `<section class="sec"><div class="cards">${T.sponsors.map(s => `<div class="frame" style="text-align:center">${A.frameDeco()}${s.logo ? `<img src="${esc(s.logo)}" alt="${esc(s.name)}" style="margin:auto;max-height:90px">` : ""}<h3 class="tc-name">${esc(s.name)}</h3><p class="kicker">${esc(s.tier || "")}</p></div>`).join("")}</div></section>` : ""}
      <section class="sec" style="padding-top:20px">${A.divider("Become a Patron")}
        <div class="perks">${PERKS.map(([k, v]) => `<div class="perk"><h4>${k}</h4><p>${v}</p></div>`).join("")}</div>
        <div class="tiers">${TIERS.map(([n, c, d]) => `<div class="tier" style="--tc:${c}"><span class="gem"></span><h4>${n}</h4><p>${d}</p></div>`).join("")}</div>
        ${lead ? `<div class="frame address">${A.frameDeco()}<p class="kicker">Talk to us</p><h3 class="tc-name">${esc(lead.name)} · ${esc(lead.role)}</h3><a class="phone" href="tel:${lead.phone.replace(/\s/g, "")}" style="font:600 1.2rem var(--f-hud)">${esc(lead.phone)}</a><p>Early sponsors get first pick of tier and branding placement.</p></div>` : ""}
      </section></div>${footer()}`;
  };

  V.contact = () => `
    <section class="realm-hero" style="${rc("water")}">
      <p class="realm-sub">Get in touch</p>
      <h1 class="realm-title" style="font-size:clamp(3rem,11vw,8rem)">Contact</h1>
    </section>
    <div class="wrap" style="${rc("gold")}">
      <section class="sec" style="padding-top:20px">${T.contacts.map(row => `<div class="people people-row">${row.map(c => `<div class="frame person">${A.frameDeco()}<p class="role">${esc(c.role)}</p><h3>${esc(c.name)}</h3>${phone(c.phone)}</div>`).join("")}</div>`).join("")}</section>
      ${T.registrationTeam && T.registrationTeam.length ? `<section class="sec" style="padding-top:0">${A.divider("Help & registration desk")}<div class="people people-row">${T.registrationTeam.map(c => `<div class="frame person">${A.frameDeco()}<p class="role">Help desk</p><h3>${esc(c.name)}</h3>${phone(c.phone)}</div>`).join("")}</div></section>` : ""}
      <section class="sec" style="padding-top:0"><div class="frame address">${A.frameDeco()}<p class="kicker">Find us</p><p>${esc(T.address)}</p>${T.email ? `<p><a class="mail" href="mailto:${esc(T.email)}">${esc(T.email)}</a></p>` : ""}
        <div class="btn-row" style="justify-content:center"><a class="btn solid" ${ext(T.mapUrl)}>Get directions <span class="arr">↗</span></a><a class="btn" ${ext(T.website)}>mgit.ac.in <span class="arr">↗</span></a></div>
        <a class="map-inline" href="#map" title="Open the campus map page"><img src="assets/campus-map.webp" alt="MGIT campus map with numbered buildings" loading="lazy"><span>Campus map · see where each trial happens ›</span></a>
        <p style="margin-top:6px">${T.socials.length ? T.socials.map(s => `<a ${ext(s.url)}>${esc(s.name)}</a>`).join(" · ") : soon("Social handles coming soon")}</p></div></section>
    </div>${footer()}`;

  /* ---------- router ---------- */
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function parse() {
    let h = "";
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* malformed hash -> home */ }
    h = h || "home";
    if (has(REALM, h)) return { v: "realm", id: h, mode: h, nav: "realms", title: `${REALM[h].name} · ${REALM[h].pillar}` };
    if (h.startsWith("t-") && has(TRIAL, h.slice(2))) { const t = TRIAL[h.slice(2)]; return { v: "trial", id: t.id, mode: t.realm, nav: "trials", title: t.name }; }
    if (has(V, h) && h !== "realm" && h !== "trial") return { v: h, mode: h, nav: h, title: h[0].toUpperCase() + h.slice(1) };
    return { v: "home", mode: "home", nav: "", title: "" };
  }
  const seen = {};
  let first = true, busy = false;
  async function route() {
    const r = parse();
    if (busy) return; busy = true;
    // if anything below throws, don't leave the router locked and the travel overlay covering the page
    try { await render(r); } finally { first = false; busy = false; $("#travel").classList.remove("on"); }
    if (parse().v !== r.v || parse().id !== r.id) route();
  }
  async function render(r) {
    $("#discover").classList.remove("on");
    if (!first) {
      $("#travel-text").textContent = r.v === "realm" ? `Travelling to ${REALM[r.id].name}` : r.v === "trial" ? `Entering the trial` : "Travelling";
      $("#travel").classList.add("on"); AUDIO.ui("travel");
      await new Promise(res => setTimeout(res, matchMedia("(hover: none)").matches ? 200 : 520));
    }
    timers.forEach(clearInterval); timers = [];
    view.innerHTML = r.v === "realm" || r.v === "trial" ? V[r.v](r.id) : V[r.v]();
    $$(".hud-nav a").forEach(a => a.classList.toggle("on", a.dataset.nav === r.nav));
    $$(".dock-a").forEach(a => a.classList.toggle("on", (r.v === "realm" || r.v === "trial") && a.dataset.realm === r.mode));
    document.title = r.title ? `${r.title} — Technovation’26` : "Technovation — The Five Realms";
    SCENE.set(r.mode); AUDIO.setRealm(r.mode);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (r.v === "home") { tick(); timers.push(setInterval(tick, 1000)); $("#cue").onclick = () => $("#s-count").scrollIntoView({ behavior: "smooth" }); }
    if (r.v === "home" || r.v === "realms") bindRing(r.mode);
    if (r.v === "trials") { drawTrials(); $$(".chip").forEach(c => c.onclick = () => { filter[c.dataset.f] = c.dataset.v; drawTrials(); }); }
    $$(".frame, .realm-hero, .hero-inner").forEach((el, i) => { el.classList.add("rise"); el.style.animationDelay = Math.min(i, 6) * 60 + "ms"; });
    if (!first) {
      setTimeout(() => $("#travel").classList.remove("on"), 120);
      if (r.v === "realm" && !seen[r.id]) { seen[r.id] = 1; setTimeout(() => discover("Realm discovered", `${REALM[r.id].name} · ${REALM[r.id].epithet}`), 500); }
      view.focus({ preventScroll: true });
    }
  }
  function discover(k, t) {
    const d = $("#discover"); $("#disc-kicker").textContent = k; $("#disc-title").textContent = t;
    d.classList.remove("on"); void d.offsetWidth; d.classList.add("on"); AUDIO.ui("discover");
  }
  addEventListener("hashchange", () => { $("#hud-nav").classList.remove("open"); route(); });

  /* ---------- HUD ---------- */
  $(".skip").addEventListener("click", e => { e.preventDefault(); view.focus(); view.scrollIntoView(); });
  $("#dock").innerHTML = T.realms.map(r => `<a class="dock-a" href="#${r.id}" data-realm="${r.id}" style="${rc(r.id)}" title="${r.name} · ${esc(r.pillar)}">${A.glyph(r.id)}${r.name}</a>`).join("");
  const st = $("#sound-toggle");
  function syncSound() { const on = AUDIO.isOn(); st.classList.toggle("sound-on", on); st.setAttribute("aria-label", on ? "Turn soundtrack off" : "Turn soundtrack on"); }
  st.onclick = async () => { try { AUDIO.isOn() ? AUDIO.stop() : await AUDIO.start(); } catch (e) {} syncSound(); };
  $("#hud-nav").insertAdjacentHTML("beforeend", `<div class="nav-realms">${T.realms.map(r => `<a href="#${r.id}" style="${rc(r.id)}">${A.glyph(r.id)}${r.name}</a>`).join("")}</div>`);
  function menu(open) { $("#hud-nav").classList.toggle("open", open); document.body.classList.toggle("menu-open", open); $("#menu-toggle").setAttribute("aria-expanded", open); $("#menu-toggle").setAttribute("aria-label", open ? "Close menu" : "Open menu"); }
  $("#menu-toggle").onclick = () => menu(!$("#hud-nav").classList.contains("open"));
  // tapping the link for the page you're already on doesn't fire hashchange, so close the menu on any link tap
  $("#hud-nav").addEventListener("click", e => { if (e.target.closest("a")) menu(false); });
  addEventListener("keydown", e => { if (e.key === "Escape") menu(false); });
  addEventListener("hashchange", () => menu(false));
  let lastHover = 0;
  document.addEventListener("pointerover", e => { if (e.pointerType !== "mouse") return; const el = e.target.closest("a, button, .chip"); if (el && el !== lastHover.el && performance.now() - (lastHover.t || 0) > 70) { lastHover = { el, t: performance.now() }; AUDIO.ui("hover"); } });
  document.addEventListener("click", e => { if (e.target.closest("a, button")) AUDIO.ui("click"); });

  // film grain
  (function () { const c = document.createElement("canvas"); c.width = c.height = 140; const x = c.getContext("2d"), d = x.createImageData(140, 140); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); document.documentElement.style.setProperty("--grain", `url(${c.toDataURL()})`); })();

  /* ---------- drone mascot ---------- */
  (function () {
    const el = $("#drone"); el.innerHTML = A.drone;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: none)").matches) return; // hidden on touch screens (see CSS)
    let x = innerWidth - 120, y = innerHeight - 150, tx = x, ty = y, px = x, idle = 0, w = el.offsetWidth;
    const home = () => { w = el.offsetWidth; tx = innerWidth - (innerWidth < 880 ? 70 : 120); ty = innerHeight - (innerWidth < 880 ? 110 : 150); };
    addEventListener("pointermove", e => { if (e.pointerType === "mouse") { tx = e.clientX + 30; ty = e.clientY + 22; idle = 0; } }, { passive: true });
    addEventListener("resize", home);
    home();
    function f(now) {
      if (++idle > 600) { tx += Math.sin(now / 900) * 0.6; }
      x += (tx - x) * 0.075; y += (ty - y) * 0.075;
      const vx = x - px; px = x;
      const bob = Math.sin(now / 320) * 4;
      const cx = Math.max(4, Math.min(innerWidth - w - 4, x - w / 2)), cy = Math.max(4, Math.min(innerHeight - w * 0.7, y + bob));
      el.style.transform = `translate3d(${cx}px,${cy}px,0) rotate(${Math.max(-20, Math.min(20, vx * 1.6))}deg)`;
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  })();

  /* ---------- gate ---------- */
  const TIPS = [
    "Tip: line followers hate glossy floors. Calibrate your IR sensors on the actual track.",
    "Tip: if your PID loop oscillates, try lowering the proportional gain first.",
    "Tip: always carry spare propellers to a drone event.",
    "Tip: secure every wire before a robot fight. Loose connectors lose matches.",
    "Tip: mechanical, electrical, control, sensing and code. Mechatronics needs all five realms."
  ];
  (function gate() {
    const g = $("#gate"); document.body.classList.add("locked");
    const behind = ["#hud-top", "#dock", "#view", ".skip"].map(q => $(q)); behind.forEach(n => n.inert = true); // nothing behind the gate is focusable
    $("#gate-sigil").innerHTML = A.sigil({ mono: true });
    const tip = $("#gate-tip"); let ti = Math.floor(Math.random() * TIPS.length); tip.textContent = TIPS[ti];
    const tipT = setInterval(() => { ti = (ti + 1) % TIPS.length; tip.textContent = TIPS[ti]; }, 3200);
    // monochrome dust
    const c = $("#gate-fx"), x = c.getContext("2d"); let run = true;
    const size = () => { c.width = innerWidth; c.height = innerHeight; }; size(); addEventListener("resize", size);
    const P = Array.from({ length: 120 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, v: 0.15 + Math.random() * 0.5, s: Math.random() * 1.8 + 0.3, p: Math.random() * 6 }));
    (function dust(t) { if (!run) return; x.clearRect(0, 0, c.width, c.height); P.forEach(p => { p.y -= p.v; p.x += Math.sin(t / 1500 + p.p) * 0.2; if (p.y < -5) { p.y = c.height + 5; p.x = Math.random() * c.width; } x.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * Math.abs(Math.sin(t / 900 + p.p))})`; x.fillRect(p.x, p.y, p.s, p.s); }); requestAnimationFrame(dust); })(0);
    // loading
    const bar = $("#gate-bar"); let pct = 0;
    const logo = new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = "assets/logo-white.webp"; });
    const ready = Promise.all([logo, document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, matchMedia("(hover: none)").matches ? 1100 : 1800))]);
    const lt = setInterval(() => { pct = Math.min(92, pct + Math.random() * 9); bar.style.width = pct + "%"; }, 120);
    ready.then(() => { clearInterval(lt); bar.style.width = "100%"; setTimeout(() => { $("#gate-load").hidden = true; $("#gate-actions").hidden = false; $("#enter-sound").focus(); }, 350); });
    async function enter(sound) {
      if (g.classList.contains("leaving")) return;
      behind.forEach(n => n.inert = false);
      // audio can fail (no Web Audio, iOS refusing to resume): never let that keep the gate shut
      if (sound) { try { await Promise.race([AUDIO.start(), new Promise(r => setTimeout(r, 2500))]); AUDIO.ui("click"); } catch (e) {} }
      syncSound();
      g.classList.add("leaving"); document.body.classList.remove("locked");
      setTimeout(() => { run = false; clearInterval(tipT); g.remove(); if (parse().v === "home") discover("Welcome, challenger", "Technovation · The Five Realms"); }, 1100);
    }
    $("#enter-sound").onclick = () => enter(true);
    $("#enter-quiet").onclick = () => enter(false);
  })();

  SCENE.start();
  route();
})();
