require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const helmet = require("helmet");

const app = express();
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'"],
      frameSrc: ["https://www.google.com"],
    },
  },
}));
app.use(express.json({ limit: "10kb" }));                          // read JSON bodies
app.use(express.static(path.join(__dirname, "..", "frontend")));   // serve the website

// Simple rate limit: 5 enquiries per IP per 10 minutes (stops spam)
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const recent = (hits.get(req.ip) || []).filter((t) => now - t < 600000);
  if (recent.length >= 5)
    return res.status(429).json({ success: false, message: "Too many attempts. Please call us." });
  recent.push(now);
  hits.set(req.ip, recent);
  next();
}

// Email is optional: it only works if SMTP_* values exist in .env
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const fail = (res, message) => res.status(400).json({ success: false, message });
const clean = (s) => String(s || "").trim().slice(0, 1000);

app.post("/api/contact", rateLimit, async (req, res) => {
  if (req.body.website) return res.json({ success: true }); // honeypot: bots fill this hidden field
  const d = {
    name: clean(req.body.name),
    phone: clean(req.body.phone),
    email: clean(req.body.email),
    service: clean(req.body.service),
    message: clean(req.body.message),
    receivedAt: new Date().toISOString(),
  };
  if (d.name.length < 2) return fail(res, "Please enter your name.");
  if (!/^[+\d][\d\s-]{7,14}$/.test(d.phone)) return fail(res, "Please enter a valid phone number.");
  if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) return fail(res, "Please check your email address.");

  // Save to a JSON file (on free hosts this file can reset, so email matters too)
  const file = path.join(__dirname, "enquiries.json");
  try {
    const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    all.push(d);
    fs.writeFileSync(file, JSON.stringify(all, null, 2));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Could not save. Please call us." });
  }

  if (mailer)
    mailer
      .sendMail({
        from: process.env.SMTP_USER,
        to: process.env.MAIL_TO,
        subject: `New enquiry: ${d.service || "General"} - ${d.name}`,
        text: Object.entries(d).map(([k, v]) => `${k}: ${v}`).join("\n"),
      })
      .catch((e) => console.error("Mail failed:", e.message));

      if (process.env.BREVO_API_KEY)
  fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Deenis Website", email: process.env.MAIL_FROM },
      to: [{ email: process.env.MAIL_TO }],
      subject: `New enquiry: ${d.service || "General"} - ${d.name}`,
      textContent: Object.entries(d).map(([k, v]) => `${k}: ${v}`).join("\n"),
    }),
  })
    .then(async (r) => { if (!r.ok) console.error("Mail failed:", r.status, await r.text()); })
    .catch((e) => console.error("Mail failed:", e.message));

      console.log("New enquiry:", JSON.stringify(d));

  res.json({ success: true, message: "Thank you. We will call you soon." });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "..", "frontend", "404.html")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Open http://localhost:${PORT}`));