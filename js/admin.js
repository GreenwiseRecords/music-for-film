/* Music for Film — manage mode.
   Writes go straight to the GitHub repo through the Contents API, so anything
   added here shows up on the live site after Pages rebuilds (~1 min).
   The token lives in this browser's localStorage only. */
(function () {
  const M = window.MFF;
  const { $, esc, state, REPO } = M;
  const API = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/contents/`;
  const CAT_PATH = "data/catalog.json";
  const LS = "mff_token";
  let manage = false;

  const token = () => localStorage.getItem(LS) || "";
  const headers = () => ({
    Authorization: "Bearer " + token(),
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  });

  const b64 = (bytes) => {
    let s = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk)
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(s);
  };
  const slug = (t) => t.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 60) || "track";

  async function shaOf(path) {
    const r = await fetch(API + path + "?ref=" + REPO.branch, { headers: headers(), cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("read " + path + " → " + r.status);
    return (await r.json()).sha;
  }

  async function put(path, base64, message) {
    const sha = await shaOf(path);
    const body = { message, content: base64, branch: REPO.branch };
    if (sha) body.sha = sha;
    const r = await fetch(API + path, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
    if (!r.ok) throw new Error("write " + path + " → " + r.status + " " + (await r.text()).slice(0, 160));
    return r.json();
  }

  async function del(path, message) {
    const sha = await shaOf(path);
    if (!sha) return;
    const r = await fetch(API + path, {
      method: "DELETE", headers: headers(),
      body: JSON.stringify({ message, sha, branch: REPO.branch }),
    });
    if (!r.ok) throw new Error("delete " + path + " → " + r.status);
  }

  const saveCatalog = (msg) =>
    put(CAT_PATH, b64(new TextEncoder().encode(JSON.stringify(state.data, null, 1))), msg);

  function say(el, m, ok) { el.textContent = m; el.style.color = ok ? "var(--gold2)" : "var(--red)"; }

  /* ---------- row actions in manage mode ---------- */
  window.afterRender = function () {
    if (!manage) return;
    $("#list").querySelectorAll(".tr").forEach((el) => {
      const t = state.data.tracks.find((x) => x.id === el.dataset.id);
      if (!t) return;
      const right = el.querySelector(".right");
      const b1 = document.createElement("button");
      b1.className = "ghost small"; b1.textContent = "✎"; b1.title = "Edit";
      b1.onclick = (e) => { e.stopPropagation(); editTrack(t); };
      const b2 = document.createElement("button");
      b2.className = "del small"; b2.textContent = "🗑"; b2.title = "Delete";
      b2.onclick = (e) => { e.stopPropagation(); delTrack(t, b2); };
      right.prepend(b2); right.prepend(b1);
    });
  };

  /* ---------- track ops ---------- */
  async function uploadAudio(file, title) {
    const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
    const path = `audio/${slug(title)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const buf = new Uint8Array(await file.arrayBuffer());
    await put(path, b64(buf), `Upload ${title}`);
    return path;
  }

  async function addTrack() {
    const st = $("#upStatus");
    const title = $("#tTitle").value.trim();
    const cat = $("#tCat").value;
    const tags = $("#tTags").value.split(",").map((s) => s.trim()).filter(Boolean);
    const note = $("#tNote").value.trim();
    const file = $("#tFile").files[0];
    if (!title) return say(st, "Give it a title.");
    if (file && file.size > 22 * 1024 * 1024) return say(st, "That file is over 22 MB — bounce it smaller first.");
    try {
      say(st, file ? "Uploading…" : "Saving…");
      const audio = file ? await uploadAudio(file, title) : "";
      const t = { id: slug(title) + "-" + Math.random().toString(36).slice(2, 6), title, cat, tags, note, audio, dur: "" };
      state.data.tracks.push(t);
      await saveCatalog(`Add "${title}"`);
      say(st, "Added. Live in a minute.", true);
      $("#tTitle").value = $("#tTags").value = $("#tNote").value = ""; $("#tFile").value = "";
      M.renderCats(); M.renderList(); fillCats();
    } catch (e) { say(st, e.message, false); }
  }

  async function delTrack(t, btn) {
    if (!confirm(`Delete "${t.title}"?` + (t.audio ? "\n\nThe audio file is removed from the repo too." : ""))) return;
    btn.disabled = true;
    try {
      if (t.audio) await del(t.audio, `Remove audio for "${t.title}"`);
      state.data.tracks = state.data.tracks.filter((x) => x.id !== t.id);
      await saveCatalog(`Delete "${t.title}"`);
      M.renderCats(); M.renderList();
    } catch (e) { alert(e.message); btn.disabled = false; }
  }

  async function editTrack(t) {
    const title = prompt("Title", t.title); if (title === null) return;
    const tags = prompt("Tags (comma separated)", (t.tags || []).join(", ")); if (tags === null) return;
    const note = prompt("Note", t.note || ""); if (note === null) return;
    const cat = prompt("Category id", t.cat); if (cat === null) return;
    const f = prompt("Replace audio with a URL or leave blank to keep", ""); 
    t.title = title.trim() || t.title;
    t.tags = tags.split(",").map((s) => s.trim()).filter(Boolean);
    t.note = note.trim();
    t.cat = cat.trim() || t.cat;
    if (f && f.startsWith("audio/")) t.audio = f.trim();
    try { await saveCatalog(`Edit "${t.title}"`); M.renderCats(); M.renderList(); }
    catch (e) { alert(e.message); }
  }

  /* ---------- category ops ---------- */
  function fillCats() {
    $("#tCat").innerHTML = state.data.categories
      .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
    $("#catAdmin").innerHTML = state.data.categories.map((c) => `
      <li data-id="${esc(c.id)}">
        <input class="cname" value="${esc(c.name)}">
        <input class="cblurb" value="${esc(c.blurb || "")}" placeholder="description">
        <button class="ghost small save">Save</button>
        <button class="del small rm">Delete</button>
      </li>`).join("");
    $("#catAdmin").querySelectorAll("li").forEach((li) => {
      const id = li.dataset.id;
      li.querySelector(".save").onclick = async () => {
        const c = state.data.categories.find((x) => x.id === id);
        c.name = li.querySelector(".cname").value.trim() || c.name;
        c.blurb = li.querySelector(".cblurb").value.trim();
        try { await saveCatalog(`Rename category ${c.name}`); M.renderCats(); M.renderList(); fillCats(); }
        catch (e) { alert(e.message); }
      };
      li.querySelector(".rm").onclick = async () => {
        const c = state.data.categories.find((x) => x.id === id);
        const n = state.data.tracks.filter((t) => t.cat === id).length;
        if (!confirm(`Delete category "${c.name}"?` + (n ? `\n\n${n} song(s) move to Unfiled.` : ""))) return;
        if (n) {
          let u = state.data.categories.find((x) => x.id === "unfiled");
          if (!u) { u = { id: "unfiled", name: "Unfiled", blurb: "Needs a home" }; state.data.categories.push(u); }
          state.data.tracks.forEach((t) => { if (t.cat === id) t.cat = "unfiled"; });
        }
        state.data.categories = state.data.categories.filter((x) => x.id !== id);
        if (state.cat === id) state.cat = "all";
        try { await saveCatalog(`Delete category ${c.name}`); M.renderCats(); M.renderList(); fillCats(); }
        catch (e) { alert(e.message); }
      };
    });
  }

  async function addCat() {
    const name = $("#cName").value.trim(); if (!name) return;
    const blurb = $("#cBlurb").value.trim();
    let id = slug(name);
    if (state.data.categories.some((c) => c.id === id)) id += "-" + Math.random().toString(36).slice(2, 5);
    state.data.categories.push({ id, name, blurb });
    try {
      await saveCatalog(`Add category ${name}`);
      $("#cName").value = $("#cBlurb").value = "";
      M.renderCats(); M.renderList(); fillCats();
    } catch (e) { alert(e.message); }
  }

  /* ---------- panel ---------- */
  function setPanel() {
    const has = !!token();
    $("#authState").textContent = has ? "token saved" : "";
    $("#work").hidden = !has;
    $("#list").classList.toggle("managing", manage);
  }

  window.initAdmin = function () {
    setPanel();
    $("#manageBtn").onclick = () => {
      manage = !manage;
      $("#manage").hidden = !manage;
      $("#manageBtn").textContent = manage ? "Done" : "Manage";
      setPanel();
      if (manage) { fillCats(); M.renderList(); if (!state.data.categories.length) M.loadData().then(() => { M.renderCats(); fillCats(); }); }
      else window.afterRender();
    };
    $("#closeManage").onclick = () => $("#manageBtn").click();
    $("#saveToken").onclick = () => { localStorage.setItem(LS, $("#token").value.trim()); $("#token").value = ""; setPanel(); fillCats(); };
    $("#clearToken").onclick = () => { localStorage.removeItem(LS); setPanel(); };
    $("#addTrack").onclick = addTrack;
    $("#addCat").onclick = addCat;
  };
})();
