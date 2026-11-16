import type { MusicData } from "./types";

/** Plays Pip's step-sequenced songs with the Web Audio API — music made from code. */

const SEMI: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };

export function freq(note: string): number | null {
  const m = /^([A-G]#?)(\d)$/.exec(note);
  if (!m) return null;
  const midi = (Number(m[2]) + 1) * 12 + SEMI[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

let ctx: AudioContext | null = null;
let stopCurrent: (() => void) | null = null;

export function isPlaying() {
  return stopCurrent !== null;
}

export function stop() {
  stopCurrent?.();
  stopCurrent = null;
}

/** Plays the song twice through. Resolves when finished or stopped. */
export function play(song: MusicData, onStep?: (i: number) => void): Promise<void> {
  stop();
  ctx ??= new AudioContext();
  const ac = ctx;
  void ac.resume();
  const master = ac.createGain();
  master.gain.value = 0.18;
  master.connect(ac.destination);

  const step = 60 / song.bpm / 2; // eighth notes
  const len = Math.max(song.melody.length, song.bass.length);
  const loops = 2;
  const t0 = ac.currentTime + 0.05;
  const oscs: OscillatorNode[] = [];

  const voice = (note: string, at: number, dur: number, wave: OscillatorType, vol: number) => {
    const f = freq(note);
    if (!f) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = wave;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(g).connect(master);
    o.start(at);
    o.stop(at + dur + 0.02);
    oscs.push(o);
  };

  for (let l = 0; l < loops; l++) {
    for (let i = 0; i < len; i++) {
      const at = t0 + (l * len + i) * step;
      const m = song.melody[i % song.melody.length];
      const b = song.bass[i % song.bass.length];
      if (m && m !== "-") voice(m, at, step * 0.95, song.wave as OscillatorType, 0.5);
      if (b && b !== "-") voice(b, at, step * 1.8, "sine", 0.7);
    }
  }

  const total = loops * len * step;
  return new Promise((resolve) => {
    let i = 0;
    const timer = setInterval(() => onStep?.(i++), step * 1000);
    const done = setTimeout(finish, total * 1000 + 300);
    function finish() {
      clearInterval(timer);
      clearTimeout(done);
      oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      master.disconnect();
      if (stopCurrent === finish) stopCurrent = null;
      resolve();
    }
    stopCurrent = finish;
  });
}
