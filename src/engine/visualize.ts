import type { Mixer } from "./mixer";

export interface VisualizerHandle {
  analyser: AnalyserNode;
  getWaveform(): Float32Array;
}

export function createVisualizer(mixer: Mixer): VisualizerHandle {
  const buffer = new Float32Array(mixer.analyser.fftSize);
  return {
    analyser: mixer.analyser,
    getWaveform() {
      mixer.analyser.getFloatTimeDomainData(buffer);
      return buffer;
    },
  };
}
