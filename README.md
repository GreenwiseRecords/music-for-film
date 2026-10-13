# Music for Film — Benny Thomas

A catalog of original songs and cues from Benny Thomas and the bands
(Cornfield, MC 2 Hour Shower, Ionic, Disappearance, Dirt Farmers, Projectyles,
Mr Greenwise, DS Analog, DJ Rockmixx, Green Wise Records).

Live: https://greenwiserecords.github.io/music-for-film/

## Editing without touching code

Open the site, hit **Manage**, paste a GitHub token (repo access on
`GreenwiseRecords/music-for-film`), and you can:

- **Upload a song** — pick a category, title it, tag it, choose an audio file.
  The file is committed to `audio/` and the entry is added to `data/catalog.json`.
- **Delete a song** — removes the entry *and* the audio file from the repo.
- **Edit a song** — title, tags, note, category.
- **Add / rename / delete categories** — deleting a category moves its songs to
  *Unfiled*.

The token is stored in that browser's localStorage only. It is never written
into the site or the repo. Anyone with the link can *listen*; only someone with
a token can change anything.

## Sharing one song (no playlist attached)

Every track with audio has its own page under `s/`, e.g.
<https://greenwiserecords.github.io/music-for-film/s/aint-going-down-back-track.html>

Those pages are **standalone**: they carry only that one song's title, project,
duration, tags and audio file. They never load `data/catalog.json`, never link
back to the catalog, and have no search or category list — the person you send
it to sees one song and nothing else. Each has link-preview tags, so iMessage /
WhatsApp / Telegram show the song title when pasted.

In the site itself:

- **🔗 on any row** — share sheet on mobile (Messages, WhatsApp…), copies the
  link on desktop.
- **🔗 Share song** in the bar — same thing for whatever is playing right now.

Rebuild the share pages whenever tracks change:

```bash
node tools/build-shares.mjs     # writes s/*.html + data/shares.json
```

It also deletes share pages for songs that are gone. Run it after uploading
through the Manage panel (the panel can't run it — it needs Node on this Mac).

## Files

```
index.html        page shell
css/style.css     styling
js/app.js         catalog render, search, player, share links
js/admin.js       GitHub Contents API (upload / delete / categories)
data/catalog.json categories + tracks  ← the source of truth
data/shares.json  track id → its single-song share page (generated)
s/                one self-contained page per song (generated)
tools/build-shares.mjs  regenerates s/ + data/shares.json
audio/            uploaded audio files
```

`audio/` is created on the first upload. Keep uploads under ~22 MB.

## Local

```bash
python3 -m http.server 8080
```
Must be served over http (`file://` blocks fetch).
