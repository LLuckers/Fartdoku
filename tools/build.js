// Bündelt index.html + CSS + JS in eine einzelne Datei.
//   node tools/build.js            -> dist/fartdoku.html (vollständiges HTML-Dokument)
//   node tools/build.js --fragment -> dist/fartdoku-artifact.html (ohne doctype/html/head/body, für Artifact-Hosting)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fragment = process.argv.includes('--fragment');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link[^>]+href="([^"]+\.css)"[^>]*>/g, (tag, href) => {
  if (/^https?:/.test(href)) return tag;
  return `<style>\n${fs.readFileSync(path.join(root, href), 'utf8')}\n</style>`;
});
html = html.replace(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
  if (/^https?:/.test(src)) return tag;
  const js = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>\n${js}\n</script>`;
});

if (fragment) {
  const bodyAttrs = (html.match(/<body([^>]*)>/i) || [])[1] || '';
  if (bodyAttrs.trim()) console.warn(`Achtung: <body${bodyAttrs}> – Attribute gehen im Fragment verloren.`);
  html = html
    .replace(/<!doctype html>/i, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<meta charset[^>]*>/i, '')
    .replace(/<meta name="viewport"[^>]*>/i, '')
    .trim();
}

const out = path.join(root, 'dist', fragment ? 'fartdoku-artifact.html' : 'fartdoku.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${path.relative(root, out)} (${(html.length / 1024).toFixed(1)} KB)`);
