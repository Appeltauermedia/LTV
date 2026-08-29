import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const landing=fs.readFileSync("index.html","utf8");
const trainer=fs.readFileSync("trainer.html","utf8");
const sitemap=fs.readFileSync("public/sitemap.xml","utf8");
const robots=fs.readFileSync("public/robots.txt","utf8");
const manifest=JSON.parse(fs.readFileSync("public/manifest.webmanifest","utf8"));

test("Landingpage und Trainer besitzen eindeutige Canonicals",()=>{
  assert.match(landing,/rel="canonical" href="https:\/\/appeltauermedia\.github\.io\/LTV\/"/);
  assert.match(trainer,/rel="canonical" href="https:\/\/appeltauermedia\.github\.io\/LTV\/trainer\.html"/);
});

test("Landingpage verlinkt den Trainer über eine crawlbare URL",()=>{
  assert.match(fs.readFileSync("src/main.js","utf8"),/href="\.\/trainer\.html"/);
});

test("Sitemap und robots.txt nennen beide indexierbaren Seiten",()=>{
  assert.match(sitemap,/<loc>https:\/\/appeltauermedia\.github\.io\/LTV\/<\/loc>/);
  assert.match(sitemap,/<loc>https:\/\/appeltauermedia\.github\.io\/LTV\/trainer\.html<\/loc>/);
  assert.match(robots,/Sitemap: https:\/\/appeltauermedia\.github\.io\/LTV\/sitemap\.xml/);
});

test("Installierte PWA startet direkt im Vokabeltrainer",()=>{
  assert.equal(manifest.start_url,"./trainer.html");
  assert.ok(manifest.shortcuts.every(shortcut=>shortcut.url.startsWith("./trainer.html")));
});
