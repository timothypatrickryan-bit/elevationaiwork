// Word helpers shared by the game and by tools/validate-content.mjs.
// Nothing here touches the page, so Node can import it too.
//
// A word is written with a little markup:
//   b[oa]t          square brackets mark the tricky part
//   sep-[a]-rate    hyphens mark syllable breaks
//   do[n't]         apostrophes are typed straight
// A sentence uses * where the word goes: "We rowed the * across the lake."

export function parseWord(markup) {
  const letters = [];
  const hard = [];
  const starts = [0];
  let inHard = false;
  for (const ch of String(markup)) {
    if (ch === '[') inHard = true;
    else if (ch === ']') inHard = false;
    else if (ch === '-') starts.push(letters.length);
    else {
      letters.push(ch);
      hard.push(inHard);
    }
  }
  const w = letters.join('');
  const syl = starts.map((from, i) => w.slice(from, i + 1 < starts.length ? starts[i + 1] : w.length)).filter(Boolean);
  // groups: each run of tricky letters, as { from, to } (to is exclusive)
  const groups = [];
  for (let i = 0; i < hard.length; i++) {
    if (hard[i] && (i === 0 || !hard[i - 1])) groups.push({ from: i, to: i + 1 });
    else if (hard[i]) groups[groups.length - 1].to = i + 1;
  }
  return { w, hard, syl, groups };
}

export const plainWord = (markup) => parseWord(markup).w;

// "We rowed the * across the lake." -> the sentence as it is spoken.
export const fullSentence = (sentence, w) => String(sentence).replace('*', w);

export const pretty = (text) => String(text).replace(/'/g, '’');

// Lines up what she typed with the right spelling (edit distance with a
// trace back), so feedback can say which letters are right.
//   marks    one entry per typed letter: { ch, ok }
//   gaps     how many letters are missing before each typed letter (and one
//            extra entry for the end)
//   kept     one entry per letter of the right spelling: true if she had it
//   distance number of changes needed
export function compare(target, attempt) {
  const a = Array.from(target);
  const b = Array.from(attempt);
  const n = a.length;
  const m = b.length;
  const d = [];
  for (let i = 0; i <= n; i++) {
    d.push(new Array(m + 1).fill(0));
    d[i][0] = i;
  }
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j - 1] + same, d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }
  const marks = b.map((ch) => ({ ch, ok: false }));
  const gaps = new Array(m + 1).fill(0);
  const kept = new Array(n).fill(false);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      marks[j - 1].ok = true;
      kept[i - 1] = true;
      i--;
      j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      gaps[j]++;
      i--;
    } else {
      j--;
    }
  }
  return { marks, gaps, kept, distance: d[n][m] };
}

// A short, kind description of what went wrong, when it is simple enough to name.
export function describeMiss(target, attempt) {
  const t = String(target);
  const s = String(attempt);
  if (t.length === s.length) {
    const diff = [];
    for (let i = 0; i < t.length; i++) if (t[i] !== s[i]) diff.push(i);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && t[diff[0]] === s[diff[1]] && t[diff[1]] === s[diff[0]]) {
      return 'Two letters have swapped places.';
    }
    if (diff.length === 1) return 'Just one letter is different.';
  }
  const { distance } = compare(t, s);
  if (distance === 1 && s.length === t.length - 1) return 'One letter is missing.';
  if (distance === 1 && s.length === t.length + 1) return 'There is one letter too many.';
  return '';
}

// Mixes the letters so the result is never the word itself (when that is possible).
export function scrambled(w, random = Math.random) {
  const letters = Array.from(w);
  if (new Set(letters).size < 2) return letters;
  for (let tries = 0; tries < 20; tries++) {
    const out = letters.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    if (out.join('') !== w) return out;
  }
  return letters.slice().reverse();
}
