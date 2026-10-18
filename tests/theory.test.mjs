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

const shape = (s, tuning) => T.guitarText(T.guitarVoicing(T.parseChord(s), tuning).frets);

test('guitar: the open and barre shapes every player knows', () => {
  const expected = {
    C: 'x32010', G: '320003', D: 'xx0232', A: 'x02220', E: '022100', F: '133211',
    Bb: 'x13331', B: 'x24442', 'F#': '244322',
    Am: 'x02210', Em: '022000', Dm: 'xx0231', Bm: 'x24432', Cm: 'x35543', 'F#m': '244222',
    E7: '020100', A7: 'x02020', D7: 'xx0212', G7: '320001', C7: 'x32310', B7: 'x21202',
    Cmaj7: 'x32000', Dm7: 'xx0211', Em7: '020000', Am7: 'x02010',
    Asus4: 'x02230', Dsus2: 'xx0230', Bm7b5: 'x2323x', Bdim7: 'x2313x', Caug: 'x32110',
    'C/E': '032010', 'C/G': '332010', 'D/F#': '200232'
  };
  for (const [name, frets] of Object.entries(expected)) assert.equal(shape(name), frets, name);
});

test('guitar: shapes follow the tuning', () => {
  // a uniform retune keeps the familiar shapes, they just name different chords
  assert.equal(shape('B', 'half'), 'x32010');
  assert.equal(shape('C', 'full'), 'xx0232');
  assert.equal(shape('E', 'full'), '244322');
  // dropping the low string makes it the root of an E-form
  assert.equal(shape('E', 'dropd'), '222100');
  assert.equal(shape('D', 'dropc'), '222100');
  assert.equal(shape('C', 'dropc'), 'xx0232');
  // open tunings are open chords
  assert.equal(shape('D', 'opend'), '000000');
  assert.equal(shape('G', 'openg'), 'x00000');
  // the standard shape for G is wrong once the low string is a D
  assert.notEqual(shape('G', 'dropd'), shape('G'));
  assert.equal(T.tuningOf('nonsense')[0], 40);
});

test('guitar: every quality in every key has a playable shape that spells the chord', () => {
  for (const tuning of T.TUNINGS) {
  const tu = tuning.midi;
  for (const root of T.SHARP) {
    // the full bass matrix for standard tuning; elsewhere plain chords plus a slash bass on two roots
    const basses = tuning.id === 'standard' ? [null, 'E', 'F#', 'Bb'] : root === 'C' || root === 'A' ? [null, 'E'] : [null];
    for (const [q] of T.QUALITIES) {
      for (const bass of basses) {
        const name = root + q + (bass ? '/' + bass : '');
        const c = T.parseChord(name);
        const v = T.guitarVoicing(c, tuning.id);
        // a slash bass that clashes with a dense chord may have no shape; plain chords always do
        if (!v) { assert.ok(bass || tuning.id !== 'standard', name + ' has no shape'); continue; }
        const pcs = new Set(c.iv.map(i => (c.rootPc + i) % 12));
        const bassPc = c.bass ? c.bass.pc : c.rootPc;
        pcs.add(bassPc);
        const sounded = v.frets.map((f, s) => (f < 0 ? -1 : (tu[s] + f) % 12));
        const live = sounded.filter(p => p >= 0);
        assert.ok(live.length >= 2, name + ' strings');
        assert.ok(live.every(p => pcs.has(p)), name + ' foreign note in ' + T.guitarText(v.frets));
        assert.equal(live[0], bassPc, name + ' lowest string');
        assert.ok(live.includes(c.rootPc), name + ' root');
        for (const i of c.iv) if (i > 0 && i < 12 && i !== 7) assert.ok(live.includes((c.rootPc + i) % 12), name + ' tone ' + i);
        const fretted = v.frets.filter(f => f > 0);
        if (fretted.length) assert.ok(Math.max(...fretted) - Math.min(...fretted) <= 3, name + ' span');
        assert.ok(v.fingers <= 4, name + ' fingers');
        const first = v.frets.findIndex(f => f >= 0), last = v.frets.length - 1 - [...v.frets].reverse().findIndex(f => f >= 0);
        assert.ok(v.frets.slice(first, last + 1).every(f => f >= 0), name + ' muted string between played strings');
        v.names.forEach((n, s) => assert.equal(n === '', v.frets[s] < 0, name + ' names'));
      }
    }
  }
  }
});

test('guitar: dots are spelled by scale degree and shapes are cached', () => {
  const v = T.guitarVoicing(T.parseChord('Bbmaj7'));
  assert.deepEqual(plain(v.names.filter(Boolean).filter((n, i, a) => a.indexOf(n) === i).sort()), ['A', 'Bb', 'D', 'F']);
  assert.equal(T.guitarVoicing(T.parseChord('Bbmaj7')), v);
  assert.equal(T.guitarText([-1, 10, 12, 12, 11, 10]), 'x-10-12-12-11-10');
});
