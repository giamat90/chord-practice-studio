# Chord Practice Studio

Type or build a chord progression, see the notes on a piano keyboard, and hear it played back.
Runs entirely in the browser: no account, no tracking, nothing is uploaded.

**Live:** https://giamat90.github.io/chord-practice-studio/

## Using it

- Type chords separated by spaces, commas or `|`: `Dm7 G7 Cmaj7 A7alt`.
- `Am7:2` holds a chord for 2 beats, `%` repeats the previous chord, `C/E` sets a bass note.
- Understood: major, minor, 6, 7, maj7, m7, m7♭5, dim, dim7, aug, sus2, sus4, 9, 11, 13, add9, ♭9, ♯9, alt and more.
  Both `♯`/`♭` and `#`/`b` work.
- Pick a root and quality in **Build a chord** to add chords without typing. Click a bar to select, audition, move, duplicate or remove it.
- Space plays or stops. Choose instrument, pattern, tempo and chord length under **Sound**.
- Your progression and settings are remembered in this browser only (`localStorage`).

## How it is built

One static page, no build step and no dependencies.

| File | What it is |
|---|---|
| `index.html` | Markup, styles, music theory module (`window.Theory`) and the app (Web Audio synthesis, scheduler, UI) |
| `fonts/`, `fonts.css` | Self-hosted woff2 fonts, see `THIRD-PARTY-NOTICES.md` |
| `tests/theory.test.mjs` | Tests for chord parsing, note spelling, voicing and patterns |

The music theory script has no DOM or audio, so the tests load it straight out of `index.html`.

## Develop

```
python -m http.server 8000      # or any static server, then open http://localhost:8000
node --test                      # Node 20+, no install needed
```

## Deploy

Served by GitHub Pages from the `main` branch root. Pushing to `main` publishes.

## License

[MIT](LICENSE)
