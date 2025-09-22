import type { Mixer } from "./mixer";
import type { NoteEvent, PartName, Settings, SynthStyle } from "@theory/notes";

interface VoiceConfig {
  wave: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  level: number;
}

interface DrumToneConfig {
  wave: OscillatorType;
  frequency: number;
  duration: number;
  level: number;
}

interface KickConfig {
  wave: OscillatorType;
  startFreq: number;
  endFreq: number;
  decay: number;
  level: number;
}

interface DrumConfig {
  kick: KickConfig;
  snare: DrumToneConfig;
  hat: DrumToneConfig;
}

interface SynthStyleConfig {
  voices: Record<PartName, VoiceConfig>;
  drums: DrumConfig;
}

const SYNTH_STYLE_CONFIG: Record<SynthStyle, SynthStyleConfig> = {
  modern: {
    voices: {
      bass: {
        wave: "sawtooth",
        attack: 0.01,
        decay: 0.35,
        sustain: 0.6,
        release: 0.2,
        level: 0.75,
      },
      arp: {
        wave: "square",
        attack: 0.005,
        decay: 0.25,
        sustain: 0.4,
        release: 0.15,
        level: 0.6,
      },
      lead: {
        wave: "sawtooth",
        attack: 0.01,
        decay: 0.4,
        sustain: 0.45,
        release: 0.25,
        level: 0.85,
      },
    },
    drums: {
      kick: { wave: "sine", startFreq: 120, endFreq: 40, decay: 0.5, level: 1 },
      snare: { wave: "square", frequency: 200, duration: 0.2, level: 0.4 },
      hat: { wave: "square", frequency: 800, duration: 0.05, level: 0.3 },
    },
  },
  chiptune: {
    voices: {
      bass: {
        wave: "square",
        attack: 0.001,
        decay: 0.08,
        sustain: 0.5,
        release: 0.08,
        level: 0.7,
      },
      arp: {
        wave: "square",
        attack: 0.001,
        decay: 0.06,
        sustain: 0.25,
        release: 0.05,
        level: 0.55,
      },
      lead: {
        wave: "square",
        attack: 0.001,
        decay: 0.07,
        sustain: 0.3,
        release: 0.06,
        level: 0.8,
      },
    },
    drums: {
      kick: { wave: "square", startFreq: 160, endFreq: 60, decay: 0.28, level: 0.9 },
      snare: { wave: "square", frequency: 450, duration: 0.12, level: 0.3 },
      hat: { wave: "square", frequency: 1400, duration: 0.04, level: 0.25 },
    },
  },
  ambient: {
    voices: {
      bass: {
        wave: "triangle",
        attack: 0.04,
        decay: 0.5,
        sustain: 0.7,
        release: 0.6,
        level: 0.7,
      },
      arp: {
        wave: "sine",
        attack: 0.12,
        decay: 0.6,
        sustain: 0.75,
        release: 0.7,
        level: 0.5,
      },
      lead: {
        wave: "sine",
        attack: 0.15,
        decay: 0.7,
        sustain: 0.8,
        release: 0.8,
        level: 0.8,
      },
    },
    drums: {
      kick: { wave: "sine", startFreq: 90, endFreq: 40, decay: 0.7, level: 0.9 },
      snare: { wave: "triangle", frequency: 180, duration: 0.35, level: 0.28 },
      hat: { wave: "sine", frequency: 600, duration: 0.08, level: 0.22 },
    },
  },
};

function frequencyFromMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function resolveStyle(settings: Settings): SynthStyleConfig {
  return SYNTH_STYLE_CONFIG[settings.synthStyle] ?? SYNTH_STYLE_CONFIG.modern;
}

export interface Synth {
  play(event: NoteEvent, time: number, settings: Settings): void;
  playDrums(step: number, time: number, settings: Settings): void;
  stopAll(): void;
}

export function createSynth(context: AudioContext, mixer: Mixer): Synth {
  const activeNodes: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  const drumGain = context.createGain();
  drumGain.gain.value = 0.3;
  drumGain.connect(mixer.input);

  function applyNiceMode(part: PartName, settings: Settings): OscillatorType {
    if (settings.nice) {
      return part === "bass" ? "triangle" : "sine";
    }
    const style = resolveStyle(settings);
    return style.voices[part].wave;
  }

  function scheduleVoice(
    voice: VoiceConfig,
    gain: GainNode,
    time: number,
    durationSeconds: number,
  ) {
    const attackEnd = time + voice.attack;
    const decayEnd = attackEnd + voice.decay;
    const sustainStart = Math.max(decayEnd, time);
    const releaseStart = Math.max(time + durationSeconds, sustainStart);
    const endTime = releaseStart + voice.release;

    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(voice.level, attackEnd);
    const sustainLevel = voice.level * voice.sustain;
    gain.gain.linearRampToValueAtTime(sustainLevel, sustainStart);
    gain.gain.setValueAtTime(sustainLevel, releaseStart);
    gain.gain.linearRampToValueAtTime(0, endTime);

    return endTime;
  }

  function play(event: NoteEvent, time: number, settings: Settings) {
    if (event.midi === null) {
      return;
    }

    const style = resolveStyle(settings);
    const voice = style.voices[event.part];

    const osc = context.createOscillator();
    osc.type = applyNiceMode(event.part, settings);
    osc.frequency.value = frequencyFromMidi(event.midi);

    const gain = context.createGain();
    gain.gain.value = 0;

    const durationSeconds = (event.durSteps / 4) * (60 / settings.bpm);
    const endTime = scheduleVoice(voice, gain, time, durationSeconds);

    osc.connect(gain);
    gain.connect(mixer.input);

    osc.start(time);
    osc.stop(endTime);

    activeNodes.push({ oscillator: osc, gain });
    osc.onended = () => {
      try {
        gain.disconnect();
        osc.disconnect();
      } catch {
        // noop
      }
      const index = activeNodes.findIndex((node) => node.oscillator === osc);
      if (index >= 0) {
        activeNodes.splice(index, 1);
      }
    };
  }

  function playTone(time: number, config: DrumToneConfig) {
    const osc = context.createOscillator();
    osc.type = config.wave;
    osc.frequency.value = config.frequency;

    const gain = context.createGain();
    gain.gain.setValueAtTime(config.level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + config.duration);

    osc.connect(gain);
    gain.connect(drumGain);
    osc.start(time);
    osc.stop(time + config.duration);
  }

  function playKick(time: number, config: KickConfig) {
    const osc = context.createOscillator();
    osc.type = config.wave;

    const gain = context.createGain();
    gain.gain.setValueAtTime(config.level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + config.decay);

    osc.frequency.setValueAtTime(config.startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(config.endFreq, time + config.decay);

    osc.connect(gain);
    gain.connect(drumGain);
    osc.start(time);
    osc.stop(time + config.decay);
  }

  function playDrums(step: number, time: number, settings: Settings) {
    const style = resolveStyle(settings);
    const { drums } = style;
    const beatPosition = step % 16;

    if (beatPosition === 0) {
      playKick(time, drums.kick);
    }
    if (beatPosition === 8) {
      playTone(time, drums.snare);
    }
    if (beatPosition % 4 === 0) {
      playTone(time, drums.hat);
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
