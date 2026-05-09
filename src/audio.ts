/**
 * Procedurally synthesized sound effects via Web Audio API.
 * No external audio assets — everything is generated on the fly so it works
 * offline and adds zero load time.
 *
 * iOS Safari requires the AudioContext to be created/resumed inside a user
 * gesture; call unlockAudio() from the first pointerdown handler.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function getCtx(): AudioContext | null {
  return ctx;
}

export function unlockAudio(): void {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
}

function noiseBuffer(durationS: number): AudioBuffer | null {
  const c = getCtx();
  if (!c) return null;
  const length = Math.max(1, Math.floor(durationS * c.sampleRate));
  const buf = c.createBuffer(1, length, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Splash into a beer-filled glass: a low "plop" + a wet noise tail. */
export function playSplash(): void {
  const c = getCtx();
  if (!c || !master) return;
  const now = c.currentTime;

  // Plop: pitched sine drop, like a drop hitting liquid.
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(720, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.55, now + 0.005);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  osc.connect(oscGain).connect(master);
  osc.start(now);
  osc.stop(now + 0.22);

  // Splash: bandpass-swept noise = wet/foam sound.
  const buf = noiseBuffer(0.32);
  if (!buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(3500, now);
  bp.frequency.exponentialRampToValueAtTime(700, now + 0.28);
  bp.Q.value = 1.4;

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.32, now + 0.012);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

  src.connect(bp).connect(noiseGain).connect(master);
  src.start(now);
  src.stop(now + 0.34);
}

/** Crowd applause: many short noise bursts on a low background wash. */
export function playApplause(): void {
  const c = getCtx();
  if (!c || !master) return;
  const now = c.currentTime;
  const totalDur = 1.7;

  // Background crowd wash.
  const bgBuf = noiseBuffer(totalDur);
  if (bgBuf) {
    const data = bgBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / c.sampleRate;
      const env =
        Math.min(t / 0.18, 1) * Math.min(Math.max(0, totalDur - t) / 0.35, 1);
      data[i] *= 0.35 * env;
    }
    const bgSrc = c.createBufferSource();
    bgSrc.buffer = bgBuf;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    const bgGain = c.createGain();
    bgGain.gain.value = 0.22;
    bgSrc.connect(hp).connect(bgGain).connect(master);
    bgSrc.start(now);
  }

  // Discrete clap impulses.
  const clapCount = 70;
  for (let i = 0; i < clapCount; i++) {
    const baseT = (i / clapCount) * totalDur;
    const jitter = (Math.random() - 0.5) * 0.06;
    const t = baseT + jitter;
    if (t < 0 || t > totalDur) continue;
    scheduleClap(now + t, 0.08 + Math.random() * 0.22);
  }
}

function scheduleClap(time: number, peak: number): void {
  const c = getCtx();
  if (!c || !master) return;
  const buf = noiseBuffer(0.06);
  if (!buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1700 + Math.random() * 900;
  bp.Q.value = 2.2;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

  src.connect(bp).connect(g).connect(master);
  src.start(time);
  src.stop(time + 0.07);
}

/** Short trumpet fanfare: G-G-G-C, sawtooth through a formant filter. */
export function playFanfare(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const G4 = 392;
  const C5 = 523.25;
  const notes: Array<{ start: number; dur: number; freq: number }> = [
    { start: 0.0, dur: 0.16, freq: G4 },
    { start: 0.2, dur: 0.16, freq: G4 },
    { start: 0.4, dur: 0.16, freq: G4 },
    { start: 0.62, dur: 0.7, freq: C5 },
  ];
  for (const n of notes) playTrumpetNote(now + n.start, n.freq, n.dur);
}

function playTrumpetNote(time: number, freq: number, dur: number): void {
  const c = getCtx();
  if (!c || !master) return;

  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);

  // Vibrato modulating frequency.
  const vibrato = c.createOscillator();
  vibrato.frequency.value = 5.8;
  const vibratoGain = c.createGain();
  vibratoGain.gain.value = 4;
  vibrato.connect(vibratoGain).connect(osc.frequency);
  vibrato.start(time);
  vibrato.stop(time + dur + 0.05);

  // Brass-like formant.
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 1.1;

  // Some high-pass to remove low rumble.
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 250;

  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(0.32, time + 0.04);
  env.gain.linearRampToValueAtTime(0.26, time + Math.min(0.1, dur * 0.6));
  env.gain.setValueAtTime(0.26, time + Math.max(0, dur - 0.08));
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  osc.connect(hp).connect(bp).connect(env).connect(master);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}
