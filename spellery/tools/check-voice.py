#!/usr/bin/env python3
"""Listens to every clip made by make-voice.py and reports the doubtful ones.

    python tools/check-voice.py WORK_DIR [--only PACK] [--skip-sentences] [--skip-words]

WORK_DIR is make-voice.py's --work folder (it holds report.json and the clips).
Needs `pip install faster-whisper transformers torch` and ffmpeg; the two
recogniser models download on first use.

Two different listeners are used, because they are good at different things:

- A speech recogniser (Whisper) writes down the words it hears. A sentence
  passes when it comes back word for word; sound-alikes such as their / there
  count as equal. Single words are written down too, but a recogniser guessing
  at one short word with nothing around it is often wrong ("niece" comes back
  as "nice"), so on its own that proves little.
- A phoneme recogniser writes down the sounds it hears in each single word
  rather than guessing a word. A word passes when those sounds match the
  sounds that were asked for, allowing for near neighbours (the vowels of
  "pin" and "pen", a soft t heard as d). Extra or missing sounds are what
  matter most: an extra sound at the start means the clip does not begin
  cleanly.

A single word that both listeners doubt deserves a human ear. For the rest,
look at the two rows of sounds printed for it. The recognisers make mistakes of
their own, so a short list of near misses is normal; a wrong word is not.
"""

import argparse
import json
import os
import re
import subprocess

import numpy as np

SOUND_ALIKE = [
    {'their', 'there', "they're"}, {'to', 'too', 'two'}, {'your', "you're"}, {'its', "it's"},
    {'hear', 'here'}, {'where', 'wear'}, {'whole', 'hole'}, {'knew', 'new'}, {'weather', 'whether'},
    {'write', 'right'}, {'eight', 'ate'}, {'weigh', 'way'}, {'threw', 'through'}, {'piece', 'peace'},
    {'plane', 'plain'}, {'which', 'witch'}, {'mom', 'mum'}, {'grandpa', 'grampa'},
    {'tv', 't v'}, {'gray', 'grey'}, {'ok', 'okay'},
]
ALIKE = {}
for group in SOUND_ALIKE:
    for w in group:
        ALIKE.setdefault(w, set()).update(group)
NUMBERS = {'1': 'one', '2': 'two', '3': 'three', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '10': 'ten', '26': 'twenty six', '30': 'thirty', '40': 'forty'}


def words_of(text):
    text = text.lower().replace('’', "'")
    text = re.sub(r"[^a-z0-9' -]", ' ', text).replace('-', ' ')
    out = []
    for w in text.split():
        w = w.strip("'")
        if w:
            out.extend(NUMBERS.get(w, w).split())
    return out


def same_word(a, b):
    return a == b or b in ALIKE.get(a, ()) or a.replace("'", '') == b.replace("'", '')


def samples(path):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ar', '16000', '-ac', '1', 'pipe:1'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


# ---------------------------------------------------------------- sounds ----
# Both the phonemes asked for (Kokoro's alphabet) and the phonemes heard (the
# recogniser's alphabet) are rewritten into one plain set before comparing.

ASKED = [('ɜɹ', 'ɝ'), ('ʧ', 'tʃ'), ('ʤ', 'dʒ'), ('A', 'eɪ'), ('I', 'aɪ'), ('O', 'oʊ'), ('W', 'aʊ'), ('Y', 'ɔɪ'),
         ('ᵊ', 'ə'), ('ᵻ', 'ɪ'), ('ɐ', 'ə'), ('ɡ', 'g'), ('ɹ', 'r'), ('T', 't')]
HEARD = {'iː': 'i', 'uː': 'u', 'ɑː': 'ɑ', 'ɔː': 'ɔ', 'ɜː': 'ɝ', 'ɚ': 'ɝ', 'ɐ': 'ə', 'ᵻ': 'ɪ', 'ɾ': 't', 'ɡ': 'g', 'ɹ': 'r', 'oː': 'oʊ', 'eː': 'eɪ',
         'a': 'æ', 'aː': 'ɑ', 'ɒ': 'ɑ', 'x': 'k', 'ɨ': 'ɪ', 'ʉ': 'u', 'e': 'ɛ', 'o': 'oʊ', 'ɑːɹ': 'ɑ r', 'ɔːɹ': 'ɔ r', 'oːɹ': 'ɔ r', 'ɛɹ': 'ɛ r', 'ɪɹ': 'ɪ r', 'ʊɹ': 'ʊ r',
         'əl': 'ə l', 'n̩': 'ə n', 'l̩': 'ə l', 'ʔ': '', 'ɬ': 'l', 'c': 'k', 'ɲ': 'n', 'əɪ': 'aɪ', 'oɪ': 'ɔɪ', 'ɔɨ': 'ɔɪ', 'ɕ': 'ʃ', 'β': 'b', 'ç': 'h', 'ʲ': '',
         # syllables the recogniser writes in the notation of other languages when a word is very short
         'th': 't', 'ts.h': 't', 's.': 'ʃ', 'y': 'u', 'ø': 'ʊ', 'ou': 'oʊ', 'ei': 'eɪ', 'iɛ': 'ɪ', 'ɑu': 'aʊ', 'ai': 'aɪ', 'kh': 'k', 'ph': 'p'}
DIPHTHONGS = ['eɪ', 'aɪ', 'oʊ', 'aʊ', 'ɔɪ', 'tʃ', 'dʒ']
VOWELS = set('iuɑɔæɛɪʊʌəɝ') | {'eɪ', 'aɪ', 'oʊ', 'aʊ', 'ɔɪ'}
NEAR = [{'ɪ', 'ɛ', 'ə', 'i'}, {'ə', 'ʌ', 'ɪ'}, {'ɑ', 'ɔ', 'ʌ', 'æ'}, {'u', 'ʊ'}, {'ɛ', 'æ', 'eɪ'}, {'ɔ', 'oʊ'}, {'ɝ', 'r', 'ə'},
        {'p', 'b'}, {'t', 'd'}, {'k', 'g'}, {'s', 'z'}, {'f', 'v'}, {'θ', 'ð', 'f', 's'}, {'ʃ', 'ʒ', 'tʃ', 'dʒ'}, {'m', 'n', 'ŋ'}, {'w', 'u', 'l'}, {'j', 'i'}]


def asked_sounds(phonemes):
    # "er" as in letter is one sound; in "around" the same two letters are a
    # schwa and then an r that starts the next beat.
    text = re.sub(r'əɹ(?![ˈˌAIOWYaeiouæɑɒɔəɛɜɪʊʌᵊᵻ])', 'ɝ', phonemes)
    text = re.sub(r'[ˈˌ.,!?:;—…"“” ]', '', text)
    for a, b in ASKED:
        text = text.replace(a, b)
    out, i = [], 0
    while i < len(text):
        two = text[i:i + 2]
        if two in DIPHTHONGS:
            out.append(two)
            i += 2
        else:
            out.append(text[i])
            i += 1
    return out


def heard_sounds(tokens):
    out = []
    for tok in tokens:
        tok = re.sub(r'\d+$', '', tok)  # tone numbers
        for sound in HEARD.get(tok, tok).split():
            if sound and not (out and out[-1] == sound):  # the same sound twice in a row is one sound
                out.append(sound)
    return out


def near(a, b):
    return a == b or any(a in group and b in group for group in NEAR)


def compare(want, got):
    """Lines the two rows up. Returns (extra at start, missing or extra consonants, vowel slips)."""
    n, m = len(want), len(got)
    cost = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        cost[i][0] = i
    for j in range(1, m + 1):
        cost[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            swap = 0 if want[i - 1] == got[j - 1] else 0.4 if near(want[i - 1], got[j - 1]) else 1
            cost[i][j] = min(cost[i - 1][j - 1] + swap, cost[i - 1][j] + 1, cost[i][j - 1] + 1)
    i, j = n, m
    lead = hard = soft = 0
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            swap = 0 if want[i - 1] == got[j - 1] else 0.4 if near(want[i - 1], got[j - 1]) else 1
            if abs(cost[i][j] - (cost[i - 1][j - 1] + swap)) < 1e-9:
                if swap == 1:
                    if want[i - 1] in VOWELS and got[j - 1] in VOWELS:
                        soft += 1
                    else:
                        hard += 1
                i, j = i - 1, j - 1
                continue
        if j > 0 and abs(cost[i][j] - (cost[i][j - 1] + 1)) < 1e-9:  # something heard that was not asked for
            if i == 0:
                lead += 1
            elif got[j - 1] in VOWELS and i == n:
                soft += 1  # a breath of a vowel after the last sound: the release of a final consonant
            elif got[j - 1] == 'r' and j > 1 and got[j - 2] == 'ɝ':
                soft += 1  # "er" running on into the next vowel
            else:
                hard += 1
            j -= 1
        else:  # something asked for that was not heard
            hard += 1
            i -= 1
    return lead, hard, soft


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('work')
    ap.add_argument('--only', default='')
    ap.add_argument('--whisper', default='small.en')
    ap.add_argument('--phones', default='facebook/wav2vec2-lv-60-espeak-cv-ft')
    ap.add_argument('--skip-sentences', action='store_true')
    ap.add_argument('--skip-words', action='store_true')
    args = ap.parse_args()

    report = json.load(open(os.path.join(args.work, 'report.json'), encoding='utf8'))
    if args.only:
        report = [r for r in report if r['pack'] == args.only]
    result = {'sentences': [], 'words': []}

    from faster_whisper import WhisperModel
    whisper = WhisperModel(args.whisper, device='cpu', compute_type='int8')

    def written(x):
        segments, _ = whisper.transcribe(x, language='en', beam_size=5, condition_on_previous_text=False, vad_filter=False)
        return ' '.join(s.text.strip() for s in segments).strip()

    def same_words(asked, got):
        want, have = words_of(asked), words_of(got)
        return len(want) == len(have) and all(same_word(a, b) for a, b in zip(want, have))

    if not args.skip_sentences:
        todo = [r for r in report if r['kind'] in ('sentence', 'ui')]
        for n, r in enumerate(todo):
            got = written(samples(r['file']))
            result['sentences'].append({'key': r['key'], 'heard': got, 'ok': same_words(r['key'], got), 'phonemes': r['phonemes']})
            if (n + 1) % 50 == 0:
                print(f'sentences: {n + 1} of {len(todo)}', flush=True)

    if not args.skip_words:
        import torch
        from huggingface_hub import hf_hub_download
        from transformers import Wav2Vec2ForCTC
        source = args.phones
        model = Wav2Vec2ForCTC.from_pretrained(source).eval()
        vocab_path = os.path.join(source, 'vocab.json') if os.path.isdir(source) else hf_hub_download(source, 'vocab.json')
        vocab = json.load(open(vocab_path, encoding='utf8'))
        names = {v: k for k, v in vocab.items()}
        blank = vocab['<pad>']
        todo = [r for r in report if r['kind'] in ('word', 'slow')]
        for n, r in enumerate(todo):
            x = samples(r['file'])
            word = written(x)
            x = (x - x.mean()) / (x.std() + 1e-7)
            with torch.no_grad():
                best = model(torch.from_numpy(x.copy()).unsqueeze(0)).logits[0].argmax(-1).tolist()
            tokens, prev = [], None
            for i in best:
                if i != prev and i != blank and not names[i].startswith('<'):
                    tokens.append(names[i])
                prev = i
            want, got = asked_sounds(r['phonemes']), heard_sounds(tokens)
            lead, hard, soft = compare(want, got)
            result['words'].append({'key': r['key'], 'want': want, 'heard': got, 'raw': tokens, 'lead': lead, 'hard': hard, 'soft': soft,
                                    'word': word, 'word_ok': same_words(r['key'].lstrip('~'), word), 'seconds': r['seconds']})
            if (n + 1) % 100 == 0:
                print(f'words: {n + 1} of {len(todo)}', flush=True)

    json.dump(result, open(os.path.join(args.work, 'heard.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)

    if result['sentences']:
        bad = [s for s in result['sentences'] if not s['ok']]
        print(f'\nSENTENCES: {len(result["sentences"]) - len(bad)} of {len(result["sentences"])} came back word for word')
        for s in bad:
            print(f'  wanted: {s["key"]}\n  heard:  {s["heard"]}\n')
    if result['words']:
        words = result['words']
        sounds_ok = lambda w: not w['lead'] and not w['hard']
        line = lambda w: f'  {w["key"]:16} asked {" ".join(w["want"]):24} heard {" ".join(w["heard"]):24} written down as {w["word"]!r}'
        print(f'\nSINGLE WORDS: {len(words)} clips')
        print(f'  {sum(1 for w in words if sounds_ok(w))} matched sound for sound (near neighbours allowed)')
        print(f'  {sum(1 for w in words if w["word_ok"])} were written down as the right word (or one that sounds the same)')
        for title, pick in (('Doubted by both listeners (listen to these first)', lambda w: not sounds_ok(w) and not w['word_ok']),
                            ('An extra sound at the start', lambda w: w['lead'] and w['word_ok']),
                            ('Right sounds, but written down as another word', lambda w: sounds_ok(w) and not w['word_ok']),
                            ('Right word, but the sounds differ', lambda w: not sounds_ok(w) and not w['lead'] and w['word_ok'])):
            some = [w for w in words if pick(w)]
            print(f'\n{title}: {len(some)}')
            for w in some:
                print(line(w))

    rough = [r['key'] for r in report if r.get('clean') is False]
    if rough:
        print(f'\nCUT BY THE CLOCK: {len(rough)} clips had no clear silence around them, so their ends may be untidy:')
        for key in rough:
            print(f'  {key}')


if __name__ == '__main__':
    main()
