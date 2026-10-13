/* Shared script for every page. Each block checks the elements it needs exist, so it is safe on all pages
   (e.g. the countdown only runs on Home, the RSVP form only on the RSVP page). */

// ----- Design mode: the logo + names-font switchers only appear when working locally -----
// (localhost, or opening index.html straight from the folder), or on the live site by adding ?design
// to the address. Everyone else sees the clean site.
if (/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname) || /[?&]design\b/.test(location.search)) {
  document.documentElement.classList.add("design-mode");
}

// ----- Presentation mode: hide design switchers for a clean video/screenshot -----
// Visit with ?present (hide switchers). Press "P" — or add ?play — for a slow
// auto-scroll walkthrough that's perfect for screen-recording.
(() => {
  const presenting = /present|clean|play/.test(location.search) || location.hash === "#present";
  if (presenting) {
    ["logo-switcher","font-switcher"].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = "none";
    });
  }
  function autoScroll(duration) {
    document.documentElement.style.scrollBehavior = "auto";
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const start = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, maxY * t);
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") { window.scrollTo(0, 0); autoScroll(42000); }
  });
  if (/play/.test(location.search)) setTimeout(() => autoScroll(42000), 1400);
})();

// ----- Scrolled state for header -----
const header = document.getElementById("site-header");
addEventListener("scroll", () => {
  header.classList.toggle("scrolled", scrollY > 30);
});

// ----- RSVP (one person per reply) -----
// Each guest replies individually so their own meal / dietary needs are captured.
// Replies are NOT saved anywhere yet: to collect real responses, send the `response`
// object built in the submit handler to a form service (Formspree / Google Forms / etc.)
// and remove the "Preview only" note in the markup.
(() => {
  const form   = document.getElementById("rsvp-form");
  const guest  = document.getElementById("rsvp-guest");
  const msg    = document.getElementById("rsvp-msg");
  const thanks = document.getElementById("rsvp-thanks");
  const again  = document.getElementById("rsvp-another");
  if (!form || !guest || !msg || !thanks) return;

  const nameEl = document.getElementById("rsvp-name");

  // meal / dietary / song only appear once the guest is attending
  guest.addEventListener("change", (e) => {
    if (e.target.type === "radio") guest.classList.toggle("is-yes", e.target.value === "yes");
  });
  guest.addEventListener("input", () => {
    guest.classList.remove("has-error");
    msg.hidden = true;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name  = nameEl.value.trim();
    const reply = guest.querySelector("input[type=radio]:checked");

    if (!name || !reply) {
      guest.classList.add("has-error");
      msg.textContent = !name ? "Please add your name." : "Please let us know if you can join us.";
      msg.classList.add("error");
      msg.hidden = false;
      if (!name) nameEl.focus();
      return;
    }

    const attending = reply.value === "yes";
    const response = {
      name,
      attending,
      // meal / dietary / song only count for guests who are attending
      meal:    attending ? document.getElementById("rsvp-meal").value : "",
      dietary: attending ? document.getElementById("rsvp-diet").value.trim() : "",
      song:    attending ? document.getElementById("rsvp-song").value.trim() : ""
    };
    // TODO: send `response` to a form service here.

    const first = name.split(/\s+/)[0];
    document.getElementById("rsvp-thanks-text").textContent = attending
      ? "Thank you, " + first + ". We can’t wait to celebrate with you."
      : "Thank you, " + first + ". We’re sorry you can’t be there – you’ll be missed.";
    form.hidden = true;
    thanks.hidden = false;
  });

  // lets the next person (e.g. a partner on the same device) reply, one at a time
  if (again) again.addEventListener("click", () => {
    form.reset();
    guest.classList.remove("is-yes", "has-error");
    msg.hidden = true;
    thanks.hidden = true;
    form.hidden = false;
    nameEl.focus();
  });
})();

// ----- Logo comparison switcher -----
(() => {
  const img = document.getElementById("logo-img");
  const sw  = document.getElementById("logo-switcher");
  if (!img || !sw) return;
  const saved = localStorage.getItem("jm-logo");
  const apply = (src) => {
    img.src = src;
    // keep any other copies of the logo (e.g. on the RSVP card) in sync
    document.querySelectorAll("img[data-logo-sync]").forEach(el => { el.src = src; });
    sw.querySelectorAll("button").forEach(b =>
      b.classList.toggle("active", b.dataset.logo === src));
  };
  const valid = [...sw.querySelectorAll("button")].some(b => b.dataset.logo === saved);
  if (saved && valid) apply(saved);
  sw.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    apply(b.dataset.logo);
    localStorage.setItem("jm-logo", b.dataset.logo);
  });
})();

// ----- Names-font switcher -----
(() => {
  const sw = document.getElementById("font-switcher");
  if (!sw) return;
  const root = document.documentElement;
  const applyBtn = (b) => {
    root.style.setProperty("--names-font", b.dataset.font);
    root.style.setProperty("--names-sx", b.dataset.sx || "1");
    root.style.setProperty("--names-sy", b.dataset.sy || "1");
    sw.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    localStorage.setItem("jm-namefont", b.dataset.font);
  };
  const saved = localStorage.getItem("jm-namefont");
  const savedBtn = [...sw.querySelectorAll("button")].find(b => b.dataset.font === saved);
  if (savedBtn) applyBtn(savedBtn);
  sw.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) applyBtn(b);
  });
})();

// ----- Countdown -----
// WEDDING_DATE — set to your ceremony date/time (year, month[0-11], day, hour, minute)
// NOTE: month is 0-indexed, so 7 = August. Currently 4 August 2027, 12:30pm (the ceremony).
const weddingDate = new Date(2027, 7, 4, 12, 30, 0);
function tick() {
  const diff = weddingDate - new Date();
  if (diff <= 0) {
    document.getElementById("countdown").innerHTML =
      '<div class="unit"><div class="num">Today</div><div class="lbl">We\'re married</div></div>';
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  document.getElementById("cd-days").textContent  = d;
  document.getElementById("cd-hours").textContent = String(h).padStart(2, "0");
  document.getElementById("cd-mins").textContent  = String(m).padStart(2, "0");
}
if (document.getElementById("cd-days")) {   // countdown only exists on the Home page
  tick();
  setInterval(tick, 1000 * 30);
}

// ----- Hero: optional flanking photos (add Photos/hero-left.jpg & hero-right.jpg to show) -----
[
  ["Photos/hero-left.jpg",  "flank-left"],
  ["Photos/hero-right.jpg", "flank-right"]
].forEach(([src, id]) => {
  const el = document.getElementById(id);
  if (!el) return;
  const probe = new Image();
  probe.onload = () => {
    el.style.backgroundImage = 'url("' + src + '")';
    el.style.display = "block";
  };
  probe.src = src;
});

// ----- Our Story photo carousel -----
// Add story.jpg, story-2.jpg, story-3.jpg (any subset) to the folder; arrows flip between them.
(() => {
  const photo = document.getElementById("story-photo");
  const prev  = document.getElementById("story-prev");
  const next  = document.getElementById("story-next");
  if (!photo) return;
  const candidates = ["Photos/engagement rings.jpeg"];
  const found = [];
  let idx = 0, pending = candidates.length;

  const render = () => {
    if (!found.length) return;
    idx = (idx + found.length) % found.length;
    photo.style.backgroundImage =
      'linear-gradient(0deg, rgba(20,17,15,.06), rgba(20,17,15,.06)), url("' + found[idx] + '")';
  };
  const settle = () => {
    if (pending) return;
    found.sort((a, b) => candidates.indexOf(a) - candidates.indexOf(b));
    const ph = photo.querySelector(".placeholder");
    const showArrows = found.length > 1 ? "" : "none";
    if (prev) prev.style.display = showArrows;
    if (next) next.style.display = showArrows;
    if (found.length) { if (ph) ph.style.display = "none"; render(); }
  };
  candidates.forEach((src) => {
    const probe = new Image();
    probe.onload  = () => { found.push(src); pending--; settle(); };
    probe.onerror = () => { pending--; settle(); };
    probe.src = src;
  });
  if (prev) prev.addEventListener("click", () => { idx--; render(); });
  if (next) next.addEventListener("click", () => { idx++; render(); });
})();
