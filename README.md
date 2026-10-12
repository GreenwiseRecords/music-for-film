# Music for Film — Benny Thomas

A catalog of original songs and cues from Benny Thomas and the bands
(Cornfield, MC 2 Hour Shower, Ionic, Disappearance, Dirt Farmers, Projectyles,
Mr Greenwise, DS Analog, DJ Rockmixx, Green Wise Records).

Live: https://djbenthomas.github.io/music-for-film/

## Editing without touching code

Open the site, hit **Manage**, paste a GitHub token (repo access on
`djbenthomas/music-for-film`), and you can:

- **Upload a song** — pick a category, title it, tag it, choose an audio file.
  The file is committed to `audio/` and the entry is added to `data/catalog.json`.
- **Delete a song** — removes the entry *and* the audio file from the repo.
- **Edit a song** — title, tags, note, category.
- **Add / rename / delete categories** — deleting a category moves its songs to
  *Unfiled*.

The token is stored in that browser's localStorage only. It is never written
into the site or the repo. Anyone with the link can *listen*; only someone with
a token can change anything.

## Files

```
index.html        page shell
css/style.css     styling
js/app.js         catalog render, search, player
js/admin.js       GitHub Contents API (upload / delete / categories)
data/catalog.json categories + tracks  ← the source of truth
audio/            uploaded audio files
```

`audio/` is created on the first upload. Keep uploads under ~22 MB.

## Local

```bash
python3 -m http.server 8080
```
Must be served over http (`file://` blocks fetch).
