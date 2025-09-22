import type { Mixer } from "./mixer";
import type { NoteEvent, PartName, Settings } from "@theory/notes";

const DECAY_TIMES: Record<PartName, number> = {
  bass: 0.35,
  arp: 0.25,
  lead: 0.5,
};

const BASE_WAVES: Record<PartName, OscillatorType> = {
  bass: "sawtooth",
  arp: "square",
  lead: "sawtooth",
};

function frequencyFromMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface Synth {
  play(event: NoteEvent, time: number, settings: Settings): void;
  playDrums(step: number, time: number): void;
  stopAll(): void;
}

export function createSynth(context: AudioContext, mixer: Mixer): Synth {
  const activeNodes: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  const drumGain = context.createGain();
  drumGain.gain.value = 0.3;
  drumGain.connect(mixer.input);

  function applyNiceMode(part: PartName, settings: Settings): OscillatorType {
    if (!settings.nice) {
      return BASE_WAVES[part];
    }
    return part === "bass" ? "triangle" : "sine";
  }

  function play(event: NoteEvent, time: number, settings: Settings) {
    if (event.midi === null) {
      return;
    }
    const osc = context.createOscillator();
    osc.type = applyNiceMode(event.part, settings);
    osc.frequency.value = frequencyFromMidi(event.midi);

    const gain = context.createGain();
    gain.gain.value = 0;

    const attack = 0.01;
    const decay = DECAY_TIMES[event.part];
    const sustainLevel = event.part === "bass" ? 0.6 : 0.4;
    const release = 0.2;

    const durationSeconds = (event.durSteps / 4) * (60 / settings.bpm);
    const endTime = time + durationSeconds + release;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1, time + attack);
    gain.gain.linearRampToValueAtTime(sustainLevel, time + attack + decay);
    gain.gain.setValueAtTime(sustainLevel, time + durationSeconds);
    gain.gain.linearRampToValueAtTime(0, endTime);

    osc.connect(gain);
    gain.connect(mixer.input);

    osc.start(time);
    osc.stop(endTime);

    activeNodes.push({ oscillator: osc, gain });
    osc.onended = () => {
      gain.disconnect();
    };
  }

  function playNoiseBurst(time: number, duration: number, frequency: number) {
    const osc = context.createOscillator();
    osc.type = "square";
    osc.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(drumGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  function playKick(time: number) {
    const osc = context.createOscillator();
    osc.type = "sine";
    const gain = context.createGain();
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.5);
    osc.connect(gain);
    gain.connect(drumGain);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  function playDrums(step: number, time: number) {
    const beatPosition = step % 16;
    if (beatPosition === 0) {
      playKick(time);
    }
    if (beatPosition === 8) {
      playNoiseBurst(time, 0.2, 200);
    }
    if (beatPosition % 4 === 0) {
      playNoiseBurst(time, 0.05, 800);
    }
  }

  function stopAll() {
    activeNodes.forEach(({ oscillator, gain }) => {
      try {
        gain.disconnect();
        oscillator.disconnect();
      } catch {
        // noop
      }
    });
    activeNodes.length = 0;
  }

  return {
    play,
    playDrums,
    stopAll,
  };
}
