/* Music for Film — catalog UI, player, search. Vanilla JS, no build step. */
const REPO = { owner: "djbenthomas", name: "music-for-film", branch: "main" };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const state = {
  data: { categories: [], tracks: [] },
  cat: "all",
  q: "",
  queue: [],
  qi: -1,
};

/* ---------------- data ---------------- */
async function loadData(bust = true) {
  const url = "data/catalog.json" + (bust ? "?v=" + Date.now() : "");
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("catalog.json " + r.status);
  state.data = await r.json();
  state.data.categories = state.data.categories || [];
  state.data.tracks = state.data.tracks || [];
}

const catName = (id) => (state.data.categories.find((c) => c.id === id) || {}).name || id;
const audioPath = (t) => (t.audio ? t.audio : null);

/* ---------------- render ---------------- */
function renderCats() {
  const counts = {};
  state.data.tracks.forEach((t) => (counts[t.cat] = (counts[t.cat] || 0) + 1));
  const withAudio = {};
  state.data.tracks.forEach((t) => { if (t.audio) withAudio[t.cat] = (withAudio[t.cat] || 0) + 1; });

  let html = `<div class="cat ${state.cat === "all" ? "on" : ""}" data-cat="all">
      <b>Everything</b><span>${state.data.tracks.length}</span></div>`;
  html += state.data.categories.map((c) => `
    <div class="cat ${state.cat === c.id ? "on" : ""}" data-cat="${esc(c.id)}">
      <b>${esc(c.name)}${c.blurb ? `<span class="blurb">${esc(c.blurb)}</span>` : ""}</b>
      <span>${withAudio[c.id] || 0}/${counts[c.id] || 0}</span>
    </div>`).join("");
  $("#cats").innerHTML = html;
  $("#cats").querySelectorAll(".cat").forEach((el) =>
    el.addEventListener("click", () => { state.cat = el.dataset.cat; renderCats(); renderList(); }));
}

function match(t) {
  if (state.cat !== "all" && t.cat !== state.cat) return false;
  if (!state.q) return true;
  const hay = [t.title, catName(t.cat), (t.tags || []).join(" "), t.note || "", t.src || ""].join(" ").toLowerCase();
  return state.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

function renderList() {
  const rows = state.data.tracks.filter(match);
  state.queue = rows;
  $("#count").textContent = `${rows.length} song${rows.length === 1 ? "" : "s"}` +
    (state.cat === "all" ? "" : " in " + catName(state.cat));
  if (!rows.length) { $("#list").innerHTML = `<div class="empty">Nothing here yet.</div>`; return; }

  const byCat = {};
  rows.forEach((t) => (byCat[t.cat] = byCat[t.cat] || []).push(t));
  const ids = state.cat === "all" ? state.data.categories.map((c) => c.id).filter((id) => byCat[id]) : [state.cat];

  $("#list").innerHTML = ids.map((id) => `
    <div class="group">
      ${state.cat === "all" ? `<h3>${esc(catName(id))}</h3>` : ""}
      ${byCat[id].sort((a, b) => a.title.localeCompare(b.title)).map(rowHTML).join("")}
    </div>`).join("");

  $("#list").querySelectorAll(".tr").forEach((el) => {
    el.querySelector(".pbtn").addEventListener("click", (e) => { e.stopPropagation(); play(rowById(el.dataset.id)); });
    el.addEventListener("dblclick", () => play(rowById(el.dataset.id)));
  });
  if (window.afterRender) window.afterRender();
}

function rowById(id) { return state.data.tracks.find((t) => t.id === id); }

function rowHTML(t) {
  const playing = state.data.tracks[state.qi] && state.queue[state.qi] && state.queue[state.qi].id === t.id;
  const tags = (t.tags || []).map((x) => `<span class="tag">${esc(x)}</span>`).join("");
  return `<div class="tr ${playing ? "playing" : ""}" data-id="${esc(t.id)}">
    <button class="pbtn" title="${t.audio ? "Play" : "No audio uploaded yet"}">${playing ? "⏸" : "▶"}</button>
    <div>
      <div class="t">${esc(t.title)}</div>
      <div class="meta">${state.cat === "all" ? esc(catName(t.cat)) : ""}${t.dur ? (state.cat === "all" ? " · " : "") + esc(t.dur) : ""}${t.note ? " · " + esc(t.note) : ""}</div>
      ${tags ? `<div class="tags"><span class="tag cat">${esc(catName(t.cat))}</span>${tags}</div>` : ""}
    </div>
    <div class="right">${t.audio ? `<span class="noaud">${esc(t.audio.split("/").pop())}</span>` : `<span class="noaud">audio needed</span>`}</div>
  </div>`;
}

/* ---------------- player ---------------- */
const audio = () => $("#audio");

function play(t) {
  if (!t) return;
  if (!t.audio) { setStatus(`"${t.title}" — no audio uploaded yet`); return; }
  const i = state.queue.findIndex((x) => x.id === t.id);
  if (i >= 0 && i === state.qi && !audio().paused) { audio().pause(); return; }
  state.qi = i;
  audio().src = t.audio;
  audio().play().catch(() => {});
  $("#nowTitle").textContent = t.title;
  $("#nowMeta").textContent = [catName(t.cat), t.dur, (t.tags || []).join(", ")].filter(Boolean).join(" · ");
  renderList();
}

function step(d) {
  if (!state.queue.length) return;
  state.qi = (state.qi + d + state.queue.length) % state.queue.length;
  play(state.queue[state.qi]);
}

function setStatus(m) { $("#status").textContent = m; setTimeout(() => { if ($("#status").textContent === m) $("#status").textContent = ""; }, 4000); }
const fmt = (s) => (isNaN(s) ? "0:00" : Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"));

function wirePlayer() {
  $("#pp").addEventListener("click", () => {
    if (!audio().src && state.queue.length) return play(state.queue[0]);
    audio().paused ? audio().play() : audio().pause();
  });
  $("#next").addEventListener("click", () => step(1));
  $("#prev").addEventListener("click", () => step(-1));
  $("#playAll").addEventListener("click", () => { state.qi = -1; step(1); });
  $("#shuffle").addEventListener("click", () => {
    state.queue = state.queue.slice().sort(() => Math.random() - 0.5); state.qi = -1; step(1);
  });
  const a = audio();
  a.addEventListener("play", () => { $("#pp").textContent = "⏸"; renderList(); });
  a.addEventListener("pause", () => { $("#pp").textContent = "▶"; });
  a.addEventListener("timeupdate", () => {
    if (!a.duration) return;
    $("#seek").value = Math.round((a.currentTime / a.duration) * 1000);
    $("#time").textContent = `${fmt(a.currentTime)} / ${fmt(a.duration)}`;
  });
  a.addEventListener("ended", () => step(1));
  $("#seek").addEventListener("input", (e) => { if (a.duration) a.currentTime = (e.target.value / 1000) * a.duration; });
  $("#q").addEventListener("input", (e) => { state.q = e.target.value; renderList(); });
}

/* ---------------- boot ---------------- */
async function boot() {
  wirePlayer();
  try { await loadData(); }
  catch (e) { $("#list").innerHTML = `<div class="empty">Couldn't load the catalog (${esc(e.message)}).</div>`; return; }
  renderCats(); renderList();
  if (window.initAdmin) window.initAdmin();
}
document.addEventListener("DOMContentLoaded", boot);
window.MFF = { $, esc, state, loadData, renderCats, renderList, setStatus, REPO, catName };
