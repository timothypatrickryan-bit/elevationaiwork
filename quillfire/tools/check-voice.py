#!/usr/bin/env python3
"""Listens to every clip made by make-voice.py and reports the doubtful ones.

    python tools/check-voice.py WORK_DIR [--only PACK]

WORK_DIR is make-voice.py's --work folder (it holds report.json and the clips).
Needs `pip install faster-whisper` and ffmpeg; the recogniser's model downloads
on first use.

A speech recogniser (Whisper) writes down the words it hears in each clip. A
clip passes when that comes back as the words that were asked for. Spelling
that cannot be heard is ignored: sound-alikes such as their / there, one word
or two (star fish), numbers as digits, and the made-up names in the game.

The recogniser makes mistakes of its own, mostly on very short clips, so a
short list of near misses is normal. Listen to those. A clip that comes back
as different words altogether should be made again: change the wording of the
line, or correct how a name is said in make-voice.py's SAY_ALWAYS table.
"""

import argparse
import json
import os
import re
import subprocess

import numpy as np

# Words a listener cannot tell apart, and the ways the recogniser spells the
# game's own names.
SOUND_ALIKE = [
    {'their', 'there', "they're"}, {'to', 'too', 'two'}, {'your', "you're"}, {'its', "it's"},
    {'hear', 'here'}, {'where', 'wear'}, {'whole', 'hole'}, {'knew', 'new'}, {'know', 'no'},
    {'write', 'right'}, {'eight', 'ate'}, {'sea', 'see'}, {'son', 'sun'}, {'blue', 'blew'},
    {'flower', 'flour'}, {'tail', 'tale'}, {'pair', 'pear'}, {'week', 'weak'}, {'meet', 'meat'},
    {'one', 'won'}, {'for', 'four'}, {'by', 'buy', 'bye'}, {'night', 'knight'}, {'which', 'witch'},
    {'would', 'wood'}, {'be', 'bee'}, {'bare', 'bear'}, {'deer', 'dear'}, {'hour', 'our'},
    {'road', 'rode'}, {'sail', 'sale'}, {'plane', 'plain'}, {'peace', 'piece'}, {'threw', 'through'},
    {'gray', 'grey'}, {'ok', 'okay'}, {'mom', 'mum'}, {'cadet', 'kadet'},
    {'blip', 'blipp', 'blib'}, {"blip's", 'blips', "blipp's"}, {'mira', 'meera', 'mirra', 'mera'}, {'ana', 'anna', 'ahna', 'onna'},
    {'zed', 'zedd', 'zead'}, {'garble', 'garbel'}, {'garbler', 'garblar'}, {'garblers', 'garblars', "garbler's"},
    {'quillfire', 'quilfire', 'quillfyre'}, {'nova', 'noah'}, {'e d', 'ed'},
]
ALIKE = {}
for group in SOUND_ALIKE:
    for w in group:
        ALIKE.setdefault(w, set()).update(group)

ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'twenty thirty forty fifty sixty seventy eighty ninety'.split()
ORDINALS = {'1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', '6th': 'sixth', '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth'}


def number(n):
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10 - 2] + (' ' + ONES[n % 10] if n % 10 else '')
    if n < 1000:
        return ONES[n // 100] + ' hundred' + (' ' + number(n % 100) if n % 100 else '')
    return str(n)


def words_of(text):
    text = text.lower().replace('’', "'").replace('‘', "'")
    text = re.sub(r"[^a-z0-9' -]", ' ', text).replace('-', ' ')
    out = []
    for w in text.split():
        w = w.strip("'")
        if not w:
            continue
        if w in ORDINALS:
            w = ORDINALS[w]
        elif w.isdigit():
            w = number(int(w))
        out.extend(w.split())
    return out


def same_word(a, b):
    return a == b or b in ALIKE.get(a, ()) or a.replace("'", '') == b.replace("'", '')


def differences(want, have):
    """Lines the two rows of words up and returns the places where they differ."""
    n, m = len(want), len(have)
    cost = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        cost[i][0] = i
    for j in range(1, m + 1):
        cost[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            swap = 0 if same_word(want[i - 1], have[j - 1]) else 1
            cost[i][j] = min(cost[i - 1][j - 1] + swap, cost[i - 1][j] + 1, cost[i][j - 1] + 1)
    out = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            swap = 0 if same_word(want[i - 1], have[j - 1]) else 1
            if cost[i][j] == cost[i - 1][j - 1] + swap:
                if swap:
                    out.append((want[i - 1], have[j - 1]))
                i, j = i - 1, j - 1
                continue
        if j > 0 and cost[i][j] == cost[i][j - 1] + 1:
            out.append(('', have[j - 1]))
            j -= 1
        else:
            out.append((want[i - 1], ''))
            i -= 1
    out.reverse()
    # "star fish" for "starfish", or "cannot" for "can not": the same sounds
    merged = []
    for pair in out:
        if merged and (merged[-1][0] + pair[0]).replace("'", '') == (merged[-1][1] + pair[1]).replace("'", ''):
            merged.pop()
        else:
            merged.append(pair)
    return merged


def samples(path):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ar', '16000', '-ac', '1', 'pipe:1'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('work')
    ap.add_argument('--only', default='')
    ap.add_argument('--whisper', default='small.en')
    args = ap.parse_args()

    report = json.load(open(os.path.join(args.work, 'report.json'), encoding='utf8'))
    if args.only:
        report = [r for r in report if r['pack'] == args.only]

    from faster_whisper import WhisperModel
    whisper = WhisperModel(args.whisper, device='cpu', compute_type='int8')

    def written(x):
        segments, _ = whisper.transcribe(x, language='en', beam_size=5, condition_on_previous_text=False, vad_filter=False)
        return ' '.join(s.text.strip() for s in segments).strip()

    heard = []
    for n, r in enumerate(report):
        got = written(samples(r['file']))
        want, have = words_of(r['key']), words_of(got)
        diff = [] if ''.join(want).replace("'", '') == ''.join(have).replace("'", '') else differences(want, have)
        heard.append({'key': r['key'], 'pack': r['pack'], 'kind': r['kind'], 'heard': got, 'diff': diff, 'words': len(want), 'seconds': r['seconds'], 'phonemes': r['phonemes']})
        if (n + 1) % 50 == 0:
            print(f'{n + 1} of {len(report)}', flush=True)
    json.dump(heard, open(os.path.join(args.work, 'heard.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)

    bad = [h for h in heard if h['diff']]
    print(f'\n{len(heard) - len(bad)} of {len(heard)} clips came back word for word')
    for title, pick in (('One word differs', lambda h: len(h['diff']) == 1),
                        ('More than one word differs (listen to these first)', lambda h: len(h['diff']) > 1)):
        some = [h for h in bad if pick(h)]
        print(f'\n{title}: {len(some)}')
        for h in some:
            changes = ', '.join(f'{a or "(nothing)"} -> {b or "(nothing)"}' for a, b in h['diff'])
            print(f'  wanted: {h["key"]}\n  heard:  {h["heard"]}\n  ({changes})\n')

    # A clip that runs much faster or slower than the rest may have lost or gained something.
    rates = sorted(h['words'] / max(0.3, h['seconds'] - 0.22) for h in heard if h['words'] >= 5)
    if rates:
        mid = rates[len(rates) // 2]
        odd = [h for h in heard if h['words'] >= 5 and not 0.6 * mid < h['words'] / max(0.3, h['seconds'] - 0.22) < 1.5 * mid]
        print(f'Usual pace: {mid:.1f} words a second. Clips far from it: {len(odd)}')
        for h in odd:
            print(f'  {h["seconds"]:.1f} s for {h["words"]} words: {h["key"]}')

    rough = [r['key'] for r in report if r.get('clean') is False]
    if rough:
        print(f'\nCUT BY THE CLOCK: {len(rough)} clips had no clear silence around them, so their ends may be untidy:')
        for key in rough:
            print(f'  {key}')


if __name__ == '__main__':
    main()
