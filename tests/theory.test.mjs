import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(scripts[0], sandbox);
const T = sandbox.Theory;
// Objects built inside the vm have a foreign Array prototype, so compare plain copies.
const plain = x => JSON.parse(JSON.stringify(x));

const notes = s => T.noteNames(T.parseChord(s));

test('triads and sevenths use the right intervals', () => {
  assert.deepEqual(plain(T.parseChord('C').iv), [0, 4, 7]);
  assert.deepEqual(plain(T.parseChord('Cm').iv), [0, 3, 7]);
  assert.deepEqual(plain(T.parseChord('G7').iv), [0, 4, 7, 10]);
  assert.deepEqual(plain(T.parseChord('Cmaj7').iv), [0, 4, 7, 11]);
  assert.deepEqual(plain(T.parseChord('Bm7b5').iv), [0, 3, 6, 10]);
  assert.deepEqual(plain(T.parseChord('Bdim7').iv), [0, 3, 6, 9]);
});

test('notes are spelled by scale degree', () => {
  assert.deepEqual(plain(notes('D#m7')), ['D#', 'F#', 'A#', 'C#']);
  assert.deepEqual(plain(notes('Bbmaj7')), ['Bb', 'D', 'F', 'A']);
  assert.deepEqual(plain(notes('F#m7b5')), ['F#', 'A', 'C', 'E']);
  assert.deepEqual(plain(notes('Bdim7')), ['B', 'D', 'F', 'Ab']);
});

test('slash bass, hold length and unicode accidentals', () => {
  const c = T.parseChord('C/E');
  assert.equal(c.bass.pc, 4);
  assert.equal(T.parseChord('Am7:2').beats, 2);
  assert.equal(T.parseChord('B♭13').text, 'Bb13');
  assert.equal(T.parseChord('D♯m7').rootPc, 3);
});

test('invalid input is rejected', () => {
  assert.equal(T.parseChord('H7'), null);
  assert.equal(T.parseChord('Cxyz'), null);
  assert.equal(T.parseChord('C:0'), null);
  assert.equal(T.parseChord('C:99'), null);
  assert.equal(T.parseChord(''), null);
});

test('progressions: separators, % repeat, and errors are reported', () => {
  const r = T.parseProgression('Dm7, G7 | Cmaj7 % Zz');
  assert.deepEqual(plain(r.chords.map(c => c.text)), ['Dm7', 'G7', 'Cmaj7', 'Cmaj7']);
  assert.deepEqual(plain(r.errors), ['Zz']);
});

test('serialize round-trips through parseProgression', () => {
  const src = 'Dm7 G7:2 C/E Bb13';
  const again = T.serialize(T.parseProgression(src).chords);
  assert.equal(again, src);
});

test('every listed quality parses on every root', () => {
  for (const root of T.SHARP.concat(T.FLAT)) {
    for (const [q] of T.QUALITIES) {
      const c = T.parseChord(root + q);
      assert.ok(c, root + q);
      assert.equal(c.iv[0], 0);
    }
  }
});

test('voicing keeps notes in range with the bass below', () => {
  let prev = null;
  for (const s of ['Dm7', 'G7', 'Cmaj7', 'A7alt', 'F#m7b5', 'C/E']) {
    const v = T.voicing(T.parseChord(s), prev);
    prev = v.upper;
    assert.ok(v.bass >= 36 && v.bass < 48, s + ' bass ' + v.bass);
    for (const m of v.upper) assert.ok(m >= 50 && m <= 83, s + ' note ' + m);
  }
});

test('patterns produce events inside the chord length', () => {
  const v = T.voicing(T.parseChord('Cmaj7'), null);
  for (const style of ['strum', 'block', 'arp', 'comp']) {
    const ev = T.pattern(style, v, 4);
    assert.ok(ev.length > 0, style);
    for (const e of ev) assert.ok(e.t >= 0 && e.t < 4, style + ' t=' + e.t);
  }
});
