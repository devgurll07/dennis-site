// Run: node make-sitemap.js https://yourdomain.com
const fs = require("fs");
const site = (process.argv[2] || "https://YOURDOMAIN.com").replace(/\/$/, "");
const src = fs.readFileSync(__dirname + "/../frontend/data.js", "utf8");
const { SERVICES } = new Function(src + "; return { SERVICES };")();
const pages = ["index.html", "about.html", "blog.html", "privacy.html", "trademark-classes.html",
  ...SERVICES.map((s) => "service.html?slug=" + s.slug)];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map((p) => `<url><loc>${site}/${p}</loc></url>`).join("\n") + `\n</urlset>\n`;
fs.writeFileSync(__dirname + "/../frontend/sitemap.xml", xml);
fs.writeFileSync(__dirname + "/../frontend/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
console.log("Done:", pages.length, "URLs");