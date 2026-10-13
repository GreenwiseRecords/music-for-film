#!/usr/bin/env node
/**
 * build-shares.mjs — generate one standalone share page per song.
 *
 * Why: Benny needs to send a single song to someone (filmmaker, sync agent,
 * collaborator) without that person seeing the whole 185-song catalog.
 *
 * Each generated page is fully self-contained: it holds its own copy of the
 * one track's info, points straight at that one audio file, and never loads
 * data/catalog.json or links anywhere near the playlist.
 *
 * Run:  node tools/build-shares.mjs      (from the repo root)
 * Writes:  s/<slug>.html   +   data/shares.json  (id -> share url)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://greenwiserecords.github.io/music-for-film";
const OUTDIR = join(ROOT, "s");

const catalog = JSON.parse(readFileSync(join(ROOT, "data", "catalog.json"), "utf8"));
const cats = new Map((catalog.categories || []).map((c) => [c.id, c.name]));
const tracks = (catalog.tracks || []).filter((t) => t.audio);

/* ---------- slug ---------- */
const slugify = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "track";

const used = new Set();
const slugFor = (t) => {
  const base = slugify(t.title) || slugify(t.id);
  let s = base, n = 2;
  while (used.has(s)) s = `${base}-${n++}`;
  used.add(s);
  return s;
};

/* ---------- helpers ---------- */
const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// safe to drop inside <script type="application/json">
const jsonForHTML = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
const pretty = (s) => String(s || "").replace(/\b[a-z]/g, (c) => c.toUpperCase()) === "" ? s : s;
const titleCase = (s) =>
  String(s || "").replace(/\s+/g, " ").trim().replace(/\b([a-z])/g, (m, c) => c.toUpperCase());

/* ---------- page ---------- */
function page(t, slug) {
  const project = cats.get(t.cat) || t.cat || "";
  const tags = (t.tags || []).filter(Boolean);
  const audioURL = "../" + String(t.audio).replace(/^\/+/, "");
  const shareURL = `${SITE}/s/${slug}.html`;
  const name = titleCase(t.title);
  const blurb = [project, t.dur, tags.join(", ")].filter(Boolean).join(" · ");

  const data = {
    title: name,
    project,
    dur: t.dur || "",
    tags,
    note: t.note || "",
    audio: audioURL,
    url: shareURL,
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>${esc(name)} — Benny Thomas</title>
<meta name="description" content="${esc(`${name} — ${blurb}. Unreleased track from Benny Thomas' catalog.`)}">
<meta property="og:type" content="music.song">
<meta property="og:title" content="${esc(`${name} — Benny Thomas`)}">
<meta property="og:description" content="${esc(blurb ? `Unreleased track · ${blurb}` : "Unreleased track")}">
<meta property="og:site_name" content="Music for Film — Benny Thomas">
<meta name="twitter:card" content="summary">
<style>
:root{--bg:#0f1012;--panel:#16181c;--panel2:#1d2026;--line:#2a2e36;--txt:#eef1f5;--dim:#98a0ae;--gold:#c9a227;--gold2:#e5c765}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{background:var(--bg);color:var(--txt);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  display:flex;align-items:center;justify-content:center;padding:24px 18px 32px;min-height:100vh}
.wrap{width:100%;max-width:520px}
.eyebrow{display:flex;align-items:center;gap:8px;color:var(--dim);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:18px}
.eyebrow .dot{width:8px;height:8px;border-radius:50%;background:var(--gold)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px 20px 18px}
h1{margin:0 0 6px;font-size:26px;line-height:1.2;letter-spacing:-.01em;font-weight:650}
.sub{color:var(--dim);font-size:13px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.chip{font-size:11.5px;color:var(--dim);border:1px solid var(--line);background:var(--panel2);border-radius:99px;padding:3px 9px}
.note{margin-top:12px;color:var(--dim);font-size:12.5px;font-style:italic}
.player{display:flex;align-items:center;gap:14px;margin-top:20px;background:var(--panel2);border:1px solid var(--line);border-radius:13px;padding:12px 14px}
.big{flex:none;width:52px;height:52px;border-radius:50%;border:1px solid var(--gold);background:var(--gold);color:#17181b;font-size:19px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer}
.big:hover{background:var(--gold2)}
.track{flex:1;min-width:0}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:4px;background:#33383f;margin:2px 0 6px;padding:0;border:0}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:var(--gold2);border:0;cursor:pointer}
.times{display:flex;justify-content:space-between;color:var(--dim);font-size:11.5px;font-variant-numeric:tabular-nums}
.row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
button.ghost{font:inherit;cursor:pointer;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--txt);padding:9px 13px}
button.ghost:hover{border-color:#3a404c}
.foot{margin-top:16px;color:var(--dim);font-size:11.5px;text-align:center;line-height:1.6}
.badge{display:inline-block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold2);border:1px solid var(--line);border-radius:99px;padding:2px 8px;margin-left:2px}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow"><span class="dot"></span><span>Benny Thomas · Music for Film</span><span class="badge">Unreleased</span></div>
  <div class="card">
    <h1>${esc(name)}</h1>
    <div class="sub">${esc(blurb)}</div>
    ${tags.length ? `<div class="chips">${tags.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>` : ""}
    ${t.note ? `<div class="note">${esc(t.note)}</div>` : ""}
    <div class="player">
      <button id="pp" class="big" aria-label="Play">▶</button>
      <div class="track">
        <input id="seek" type="range" min="0" max="1000" value="0" aria-label="Seek">
        <div class="times"><span id="cur">0:00</span><span id="tot">${esc(t.dur || "0:00")}</span></div>
      </div>
    </div>
    <audio id="audio" preload="metadata" src="${esc(audioURL)}"></audio>
    <div class="row">
      <button class="ghost" id="shareBtn">Share this song</button>
      <button class="ghost" id="copyBtn">Copy link</button>
      <button class="ghost" id="loopBtn">Loop</button>
    </div>
  </div>
  <div class="foot">Sent to you by Benny Thomas · one track only.<br>Unreleased — please don't repost.</div>
</div>
<script type="application/json" id="track-data">${jsonForHTML(data)}</script>
<script>
(function(){
  var d = JSON.parse(document.getElementById("track-data").textContent);
  var a = document.getElementById("audio"), pp = document.getElementById("pp");
  var seek = document.getElementById("seek"), cur = document.getElementById("cur"), tot = document.getElementById("tot");
  var loop = false;
  var fmt = function(s){ if(!isFinite(s)) return "0:00"; return Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,"0"); };

  pp.addEventListener("click", function(){ a.paused ? a.play() : a.pause(); });
  a.addEventListener("play", function(){ pp.textContent = "❚❚"; });
  a.addEventListener("pause", function(){ pp.textContent = "▶"; });
  a.addEventListener("timeupdate", function(){
    if(!a.duration) return;
    seek.value = Math.round((a.currentTime / a.duration) * 1000);
    cur.textContent = fmt(a.currentTime);
  });
  a.addEventListener("loadedmetadata", function(){ if(a.duration) tot.textContent = fmt(a.duration); });
  a.addEventListener("ended", function(){ if(loop) a.play(); });
  seek.addEventListener("input", function(e){ if(a.duration) a.currentTime = (e.target.value/1000) * a.duration; });
  document.getElementById("loopBtn").addEventListener("click", function(){
    loop = !loop; this.textContent = loop ? "Looping ✓" : "Loop";
  });

  var flash = function(btn, msg, back){
    var old = btn.textContent; btn.textContent = msg;
    setTimeout(function(){ btn.textContent = back || old; }, 1800);
  };
  document.getElementById("shareBtn").addEventListener("click", function(){
    var btn = this;
    if(navigator.share){ navigator.share({ title: d.title + " — Benny Thomas", text: d.project + " · unreleased", url: location.href }).catch(function(){}); return; }
    copy(btn);
  });
  document.getElementById("copyBtn").addEventListener("click", function(){ copy(this); });
  function copy(btn){
    var url = location.href;
    if(navigator.clipboard && window.isSecureContext){
      navigator.clipboard.writeText(url).then(function(){ flash(btn, "Copied ✓"); }, function(){ prompt("Copy this link:", url); });
    } else { prompt("Copy this link:", url); }
  }
})();
</script>
</body>
</html>
`;
}

/* ---------- run ---------- */
mkdirSync(OUTDIR, { recursive: true });
const shares = {};
const written = new Set();

for (const t of tracks) {
  const slug = slugFor(t);
  const rel = `s/${slug}.html`;
  writeFileSync(join(ROOT, rel), page(t, slug), "utf8");
  shares[t.id] = rel;
  written.add(`${slug}.html`);
}

let removed = 0;
for (const f of readdirSync(OUTDIR)) {
  if (f.endsWith(".html") && !written.has(f)) { unlinkSync(join(OUTDIR, f)); removed++; }
}

writeFileSync(join(ROOT, "data", "shares.json"), JSON.stringify(shares, null, 1) + "\n", "utf8");

console.log(`share pages written: ${written.size}`);
console.log(`stale pages removed: ${removed}`);
console.log(`shares.json entries: ${Object.keys(shares).length}`);
if (!existsSync(join(ROOT, "data", "shares.json"))) process.exit(1);
