#!/usr/bin/env python3
"""Makes Blip's recorded voice.

Blip's lines are recordings in audio/, made by this script with the open
Kokoro text-to-speech model (Apache 2.0 licence). The game does not use the
device's own speech voice, because an iPad mutes that voice in silent mode.

    node tools/voice-list.mjs > /tmp/voice-list.json
    python tools/make-voice.py /tmp/voice-list.json [--work DIR] [--only PACK]

Needs: Python 3.12, `pip install kokoro==0.9.4 soundfile`, `python -m spacy
download en_core_web_sm`, and ffmpeg on the PATH. The model itself (about
330 MB) is fetched from https://huggingface.co/hexgrad/Kokoro-82M on first use.
The kokoro version is pinned because Speaker.attempt() hands the model a speed
for each sound, which that version accepts.

Output: audio/<pack>.bin (MP3 clips, back to back) and audio/index.json, which
says where each clip sits: { packs: [...], clips: { text: [pack, offset, length] } }.
A clip's key is the text it speaks.

Run tools/check-voice.py afterwards: a speech recogniser listens to every clip
and reports any that do not come back as the words that were asked for.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys

import numpy as np

RATE = 24000
VOICE = 'af_bella'
SPEED = {'line': 1.0, 'read': 0.92}  # Blip's own lines, and sentences read aloud
BITRATE = '40k'
# Every clip is spoken in the middle of a longer line, "Spell this word: ... -- Next word.",
# and the two ends are cut off again (see Speaker.speak). A frame is: what is said before
# the clip, the mark between the two, how many times longer than usual that mark is held,
# then the same for the mark after the clip, and what is said after it. The frames are
# tried in turn until one leaves a clear silence on both sides of the clip.
FRAMES = [
    ('spˈɛl ðɪs wˈɜɹd', ': ', 6, ' — ', 2, 'nˈɛkst wˈɜɹd.'),
    ('spˈɛl ðɪs wˈɜɹd', '. — ', 1, ' — ', 1, 'nˈɛkst wˈɜɹd.'),
    ('spˈɛl ðɪs wˈɜɹd', ': — ', 1, ' — ', 1, 'nˈɛkst wˈɜɹd.'),
]

# How a few names are said, in Kokoro's own alphabet (I = the vowel in "my",
# A = "day", O = "go"). Anything not listed is left to the model's dictionary.
SAY_ALWAYS = {
    'quillfire': 'kwˈɪlfˌIəɹ',
    'garbler': 'ɡˈɑɹblɚ',
    'garblers': 'ɡˈɑɹblɚz',
    'mira': 'mˈɪɹə',
    'ana': 'ˈɑnə',
    'blip': 'blˈɪp',
    'zed': 'zˈɛd',
}


def norm_key(text):
    return ' '.join(text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').split())


class Speaker:
    def __init__(self):
        import torch
        from kokoro import KPipeline

        torch.set_num_threads(os.cpu_count() or 4)
        self.torch = torch
        self.pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
        self.g2p = self.pipe.g2p

    def phonemes(self, item):
        _, tokens = self.g2p(item['text'])
        out = ''
        for tok in tokens:
            ph = SAY_ALWAYS.get(norm_key(tok.text).lower(), tok.phonemes)
            out += (ph if ph is not None else '') + tok.whitespace
        if not out.rstrip().endswith(('.', '!', '?', '"', '”')):
            out = out.rstrip() + '.'  # a title such as "Moon Dust" still ends like a sentence
        return out

    def speak(self, phonemes, speed):
        """Returns the audio for these phonemes alone, cut cleanly at both ends.

        Left to itself the model puts a short voiced noise in front of whatever
        it says first, which turns "stick" into something like "uh-stick", and
        after its last sound it adds a faint click or puff, which can pass for
        one more consonant ("summer-k"). So every clip is spoken in the middle
        of a longer line, "Spell this word: ... -- Next word.", with a pause on
        either side, and the two ends are cut off again.

        Sets self.clean (a clear silence was found on both sides) and
        self.frame (which of FRAMES was used).
        """
        first = None
        for number, frame in enumerate(FRAMES):
            audio, clean = self.attempt(phonemes, speed, frame)
            if clean:
                self.clean, self.frame = True, number
                return audio
            if first is None:
                first = audio
        self.clean, self.frame = False, 0
        return first

    def attempt(self, phonemes, speed, frame):
        before, mark_in, hold_in, mark_out, hold_out, after = frame
        known = self.pipe.model.vocab  # the model skips any character it does not know
        pace = [speed]
        for part, hold in ((before, 1), (mark_in, hold_in), (phonemes, 1), (mark_out, hold_out), (after, 1)):
            # A held mark is silence; a held space would drag out the sound next to it.
            pace += [speed if ch == ' ' else speed / hold for ch in part if ch in known]
        pace.append(speed)
        text = before + mark_in + phonemes + mark_out + after
        result = None
        for result in self.pipe.generate_from_tokens(tokens=text, voice=VOICE, speed=self.torch.tensor(pace)):
            pass
        audio = result.audio.numpy().astype(np.float32)
        steps = result.pred_dur.numpy()
        step = len(audio) / float(steps.sum())

        def reported(text):
            """Where the model says the sound after `text` begins, in samples.

            Speech runs three steps ahead of the reported boundaries (the
            model's own timestamp code makes the same correction).
            """
            sounds = sum(1 for ch in text if ch in known)
            return int((float(steps[: 1 + sounds].sum()) - 3) * step)

        starts = reported(before + mark_in)
        resumes = reported(before + mark_in + phonemes + mark_out)  # the first sound of "Next word"

        # The model's timings say roughly where the clip begins and ends; the
        # exact cuts are made in the silence of the two pauses.
        tick = RATE // 200  # 5 ms
        n = len(audio) // tick
        level = np.sqrt((audio[: n * tick].reshape(n, tick) ** 2).mean(axis=1))
        quiet = level < level.max() * 10 ** (-48 / 20)

        def pause(near, reach):
            """The nearest 40 ms or more of silence that ends at or before tick `near`."""
            i, first = min(n - 1, near), max(0, near - reach)
            while i > first:
                if quiet[i]:
                    j = i
                    while j > 0 and quiet[j - 1]:
                        j -= 1
                    if i - j + 1 >= 8:
                        return j, i
                    i = j - 1
                else:
                    i -= 1
            return None

        lead = pause(starts // tick + 8, 78)    # looking back from a little after the reported start
        trail = pause(resumes // tick + 8, 48)
        # The clip starts 10 ms before its first sound and ends 20 ms after its last.
        cut = max(0, (lead[1] - 1) * tick if lead else starts - int(0.03 * RATE))
        end = min(trail[0] + 4, trail[1]) * tick if trail else reported(before + mark_in + phonemes)
        final = max(i for i, ch in enumerate(phonemes) if ch.isalpha() and ch not in 'ˈˌ')
        if phonemes[final] == 'b' and trail:
            # This voice lets go of a final b with a voiced puff long enough to
            # pass for one more syllable ("cube-uh"). The puff stays, but from
            # its loudest moment on it now fades away within 50 ms.
            b = reported(before + mark_in + phonemes[:final]) // tick
            closed = b + int(np.argmin(level[b: b + 24]))          # the quietest moment of the b
            loudest = closed + int(np.argmax(level[closed: end // tick]))
            fade = np.linspace(1, 0, 10 * tick, dtype=np.float32)
            at = loudest * tick
            if at + len(fade) < end:
                audio[at: at + len(fade)] *= fade
                audio[at + len(fade):] = 0
                end = at + len(fade) + 4 * tick
        audio = audio[cut: max(cut + tick, end)].copy()
        fade_in, fade_out = int(0.008 * RATE), int(0.015 * RATE)
        if len(audio) > fade_in + fade_out:
            audio[:fade_in] *= np.linspace(0, 1, fade_in, dtype=np.float32)
            audio[-fade_out:] *= np.linspace(1, 0, fade_out, dtype=np.float32)
        return audio, bool(lead and trail)


def tidy(audio):
    """Evens out the loudness and pads both ends with silence."""
    frame = RATE // 100
    n = len(audio) // frame
    if n >= 3:
        energy = np.sqrt((audio[: n * frame].reshape(n, frame) ** 2).mean(axis=1))
        voiced = energy[energy > energy.max() * 0.1]
        level = float(np.sqrt((voiced ** 2).mean())) if len(voiced) else 0.0
        if level > 0:
            audio = audio * (0.11 / level)
        peak = float(np.abs(audio).max())
        if peak > 0.97:
            audio = audio * (0.97 / peak)
    # A device waking its speaker can swallow the very start of a sound.
    return np.concatenate([np.zeros(int(0.12 * RATE), np.float32), audio.astype(np.float32), np.zeros(int(0.1 * RATE), np.float32)])


def to_mp3(audio):
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', 'pipe:0',
           '-c:a', 'libmp3lame', '-b:a', BITRATE, '-write_xing', '0', '-id3v2_version', '0', '-f', 'mp3', 'pipe:1']
    done = subprocess.run(cmd, input=audio.astype('<f4').tobytes(), capture_output=True, check=True)
    return done.stdout


def main():
    global VOICE
    ap = argparse.ArgumentParser()
    ap.add_argument('list')
    ap.add_argument('--work', default='voice-work', help='where finished clips are kept between runs')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio'))
    ap.add_argument('--only', default='', help='make just this pack (for a quick look); the index is not written')
    ap.add_argument('--voice', default=VOICE, help='the Kokoro voice to use')
    args = ap.parse_args()

    items = json.load(open(args.list, encoding='utf8'))
    if args.only:
        items = [i for i in items if i['pack'] == args.only]
    os.makedirs(args.work, exist_ok=True)
    os.makedirs(args.out, exist_ok=True)
    VOICE = args.voice
    speaker = Speaker()

    report = []
    packs = {}
    for n, item in enumerate(items):
        key = norm_key(item['text'])
        ph = speaker.phonemes(item)
        speed = SPEED[item['kind']]
        stamp = hashlib.sha1(f'q1|{VOICE}|{speed}|{BITRATE}|{ph}'.encode()).hexdigest()[:16]
        path = os.path.join(args.work, stamp + '.mp3')
        if not os.path.exists(path):
            audio = tidy(speaker.speak(ph, speed))
            with open(path + '.tmp', 'wb') as f:
                f.write(to_mp3(audio))
            os.replace(path + '.tmp', path)
            np.save(os.path.join(args.work, stamp + '.len.npy'), np.array([len(audio) / RATE, 1.0 if speaker.clean else 0.0, float(speaker.frame)]))
        seconds, clean, frame = (float(x) for x in np.load(os.path.join(args.work, stamp + '.len.npy')))
        if not clean:
            print(f'  no clear silence around {key!r}; it was cut by the clock instead', flush=True)
        packs.setdefault(item['pack'], []).append((key, path))
        report.append({'key': key, 'kind': item['kind'], 'pack': item['pack'], 'phonemes': ph, 'seconds': round(seconds, 2), 'file': path, 'clean': bool(clean), 'frame': int(frame)})
        if (n + 1) % 50 == 0 or n + 1 == len(items):
            print(f'{n + 1} of {len(items)}', flush=True)

    names = sorted(packs, key=lambda p: (p != 'ui', p))
    index = {'packs': names, 'clips': {}}
    total = 0
    for pi, name in enumerate(names):
        blob = b''
        for key, path in packs[name]:
            data = open(path, 'rb').read()
            if key in index['clips']:
                sys.exit(f'two clips share the text {key!r}')
            index['clips'][key] = [pi, len(blob), len(data)]
            blob += data
        with open(os.path.join(args.out, name + '.bin'), 'wb') as f:
            f.write(blob)
        total += len(blob)
    if not args.only:
        with open(os.path.join(args.out, 'index.json'), 'w', encoding='utf8') as f:
            json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(args.work, 'report.json'), 'w', encoding='utf8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    seconds = sum(r['seconds'] for r in report)
    print(f'{len(report)} clips in {len(names)} packs, {seconds / 60:.1f} minutes of speech, {total / 1e6:.1f} MB')
    print('  ' + ', '.join(f'{sum(1 for r in report if r["clean"] and r["frame"] == k)} cut from frame {k + 1}' for k in range(len(FRAMES)))
          + f', {sum(1 for r in report if not r["clean"])} cut by the clock')


if __name__ == '__main__':
    main()
