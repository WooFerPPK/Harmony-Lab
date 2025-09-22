import type { Settings } from "@theory/notes";

export interface Mixer {
  input: GainNode;
  master: GainNode;
  analyser: AnalyserNode;
  updateFromSettings(settings: Settings): void;
  tickAutoGain(): void;
}

const TARGET_PEAK = 0.8;

function createWaveshaper(context: AudioContext, amount: number): WaveShaperNode {
  const curve = new Float32Array(44100);
  const deg = Math.PI / 180;
  const k = amount * 100;
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i * 2) / curve.length - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  const node = context.createWaveShaper();
  node.curve = curve;
  node.oversample = "4x";
  return node;
}

export function createMixer(context: AudioContext): Mixer {
  const input = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;

  const drivePreGain = context.createGain();
  drivePreGain.gain.value = 1;

  const drive = createWaveshaper(context, 0.2);
  const drivePostGain = context.createGain();
  drivePostGain.gain.value = 0.8;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.25;

  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;

  const master = context.createGain();
  master.gain.value = 0.8;

  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;

  const delaySend = context.createGain();
  delaySend.gain.value = 0.25;
  const delay = context.createDelay(1.5);
  delay.delayTime.value = 0.3;
  const delayFeedback = context.createGain();
  delayFeedback.gain.value = 0.3;
  const delayMix = context.createGain();
  delayMix.gain.value = 0.25;

  input.connect(filter);
  filter.connect(drivePreGain);
  drivePreGain.connect(drive);
  drive.connect(drivePostGain);
  drivePostGain.connect(compressor);
  compressor.connect(limiter);
  limiter.connect(master);
  master.connect(context.destination);
  master.connect(analyser);

  drivePostGain.connect(delaySend);
  delaySend.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(delayMix);
  delayMix.connect(master);

  let autoGainEnabled = true;

  function applyLimiter(enabled: boolean) {
    limiter.threshold.setTargetAtTime(enabled ? -3 : 0, context.currentTime, 0.01);
    limiter.ratio.setTargetAtTime(enabled ? 20 : 1, context.currentTime, 0.01);
  }

  function applyNiceMode(enabled: boolean) {
    filter.Q.setTargetAtTime(enabled ? 0.9 : 0.7, context.currentTime, 0.01);
    filter.frequency.setTargetAtTime(enabled ? 1400 : 1800, context.currentTime, 0.01);
    delayMix.gain.setTargetAtTime(enabled ? 0.35 : 0.25, context.currentTime, 0.01);
    drivePostGain.gain.setTargetAtTime(enabled ? 0.6 : 0.8, context.currentTime, 0.01);
  }

  function updateFromSettings(settings: Settings) {
    filter.frequency.setTargetAtTime(settings.cutoff, context.currentTime, 0.01);
    delayFeedback.gain.setTargetAtTime(settings.delayFB, context.currentTime, 0.05);
    drivePreGain.gain.setTargetAtTime(1 + settings.drive * 6, context.currentTime, 0.02);
    master.gain.setTargetAtTime(settings.master, context.currentTime, 0.01);
    applyLimiter(settings.limiter);
    autoGainEnabled = settings.autoGain;
    applyNiceMode(settings.nice);
  }

  const buffer = new Float32Array(analyser.fftSize);

  function tickAutoGain() {
    if (!autoGainEnabled) {
      return;
    }
    analyser.getFloatTimeDomainData(buffer);
    let peak = 0;
    for (const value of buffer) {
      peak = Math.max(peak, Math.abs(value));
    }
    if (peak === 0) {
      return;
    }
    const diff = TARGET_PEAK / peak;
    const target = Math.min(1, master.gain.value * diff);
    master.gain.setTargetAtTime(target, context.currentTime, 0.1);
  }

  return {
    input,
    master,
    analyser,
    updateFromSettings,
    tickAutoGain,
  };
}
