// Shared header, footer, form + page logic. HTML pages stay small because the parts live here.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tel = SITE.phone.replace(/\s/g, "");

$("#siteHeader").innerHTML = `<div class="wrap bar"><a class="logo" href="index.html"><img src="logo.png" alt="${esc(SITE.name)}"><span>${esc(SITE.name)}</span></a>
<nav aria-label="Main"><a href="index.html#services">Services</a><a href="index.html#process">How it works</a><a href="index.html#faq">FAQ</a><a href="index.html#contact">Contact</a></nav>
<a class="btn" href="tel:${tel}">Call us</a></div>`;

$("#siteFooter").innerHTML = `<div class="wrap foot"><div><strong>${esc(SITE.name)}</strong>
<p><a href="tel:${tel}">${esc(SITE.phone)}</a>${SITE.email ? ` · <a href="mailto:${SITE.email}">${esc(SITE.email)}</a>` : ""} · <a href="https://wa.me/${SITE.whatsapp}">WhatsApp</a></p>
<p>${SITE.offices.map((o) => `<b>${esc(o.label)}:</b> ${esc(o.address)}`).join("<br>")}</p>
<p>${Object.entries(SITE.social).map(([n, u]) => `<a href="${u}" rel="noopener">${esc(n)}</a>`).join(" · ")}</p></div>
<p class="small"><a href="privacy.html">Privacy policy</a> · <a href="trademark-classes.html">Trademark classes</a><br> · <a href="trademark-classes.html">Trademark classes</a><br>This website gives general information. It is not legal advice and is not meant to solicit work. Browsing it or sending an enquiry does not create a lawyer-client relationship.
© ${new Date().getFullYear()} ${esc(SITE.name)}</p></div>`;

const mount = $("#formMount");
if (mount) {
  mount.innerHTML = `<form id="contactForm" novalidate>
<label>Your name<input name="name" autocomplete="name" required></label>
<label>Phone<input name="phone" type="tel" autocomplete="tel" required></label>
<label>Email (optional)<input name="email" type="email" autocomplete="email"></label>
<label>What do you need?<select name="service"><option value="">Not sure yet</option>${SERVICES.map((s) => `<option>${esc(s.title)}</option>`).join("")}</select></label>
<label>Details (optional)<textarea name="message" rows="3"></textarea></label>
<input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<label class="check"><input type="checkbox" name="consent" required> I agree that you may contact me about this enquiry.</label>
<button class="btn alt" type="submit">Send enquiry</button><p id="formStatus" role="status"></p></form>`;
  $("#contactForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, status = $("#formStatus"), btn = f.querySelector("button");
    if (!f.consent.checked) { status.textContent = "Please tick the consent box."; return; }
    btn.disabled = true; status.textContent = "Sending...";
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(f))) });
      const out = await res.json();
      status.textContent = out.message || "Done.";
      if (out.success) f.reset();
    } catch { status.textContent = "Could not reach the server. Please call us."; }
    btn.disabled = false;
  });
}

// ---- Home page: finder + service grid
const finder = $("#finder");
if (finder) {
  const link = (s) => `<a href="service.html?slug=${s.slug}"><b>${esc(s.title)}</b><span>${esc(s.short)}</span></a>`;
  const show = () => {
    const q = finder.value.trim().toLowerCase();
    const hits = q ? SERVICES.filter((s) => `${s.title} ${s.short} ${s.cat}`.toLowerCase().includes(q)).slice(0, 4) : SERVICES.slice(0, 4);
    $("#finderOut").innerHTML = hits.length ? hits.map(link).join("") : `<p>No match yet. <a href="#contact">Tell us what you need</a> and we will guide you.</p>`;
  };
  finder.addEventListener("input", show); show();

  let cat = "All";
  const draw = () => {
    $("#chips").innerHTML = ["All", ...CATEGORIES].map((c) => `<button class="chip" aria-pressed="${c === cat}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
    $("#grid").innerHTML = SERVICES.filter((s) => cat === "All" || s.cat === cat).map((s) => `<article class="card"><h3>${esc(s.title)}</h3><p>${esc(s.short)}</p><a href="service.html?slug=${s.slug}">Documents and steps</a></article>`).join("");
  };
  $("#chips").addEventListener("click", (e) => { if (e.target.dataset.c) { cat = e.target.dataset.c; draw(); } });
  draw();
}

// ---- Service page: one template, any service (?slug=...)
const detail = $("#serviceDetail");
if (detail) {
  const s = SERVICES.find((x) => x.slug === new URLSearchParams(location.search).get("slug"));
  if (!s) detail.innerHTML = `<h1>Service not found</h1><p><a href="index.html#services">See all services</a></p>`;
  else {
    document.title = `${s.title} | ${SITE.name}`;
    $('meta[name="description"]').content = s.short;
    detail.innerHTML = `<p class="crumb"><a href="index.html#services">Services</a> / ${esc(s.cat)}</p><h1>${esc(s.title)}</h1><p class="lead">${esc(s.short)}</p>
<div class="two"><section><h2>Documents usually needed</h2><ul>${s.docs.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></section>
<section><h2>How it works</h2><ol>${s.steps.map((d) => `<li>${esc(d)}</li>`).join("")}</ol></section></div>
<p class="small">Requirements can differ by case. We confirm the exact list when you contact us.</p>`;
  }
}