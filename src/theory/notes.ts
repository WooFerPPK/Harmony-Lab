export type Midi = number; // 0..127
export type NoteToken = string; // "C4" | "Eb5" | "F#3" | "---"

export type Degree = 0 | 1 | 2 | 3 | 4 | 5 | 6; // I..VII
export type Mode = "major" | "minor";
export type KeyName =
  | "C"
  | "C#"
  | "D"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "Ab"
  | "A"
  | "Bb"
  | "B";

export type SynthStyle = "modern" | "chiptune" | "ambient";

export interface Settings {
  key: KeyName;
  mode: Mode;
  bars: 4 | 8 | 16;
  bpm: number; // 70..130
  swing: number; // 0..0.25
  master: number; // 0..1
  cutoff: number; // Hz
  delayFB: number; // 0..0.8
  drive: number; // 0..0.5
  limiter: boolean;
  autoGain: boolean;
  nice: boolean;
  lockNotes: boolean;
  synthStyle: SynthStyle;
}

export interface Progression {
  bars: number;
  degrees: Degree[];
}

export type PartName = "lead" | "arp" | "bass";

export interface NoteEvent {
  part: PartName;
  step: number; // 16th index
  durSteps: number; // duration in 16ths
  midi: Midi | null; // null = rest
}

export type PartNoteMap = Record<PartName, (Midi | null)[]>;

const NOTE_NAME_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const SEMITONE_TO_NOTE_NAME = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const OCTAVE_MIN = -1;
const OCTAVE_MAX = 9;
const NOTE_TOKEN_REGEX = /^([A-Ga-g])([#bB]?)(-?\d)$/;

export const REST_TOKEN = "---";

export function clampMidi(midi: Midi): Midi {
  return Math.min(127, Math.max(0, Math.round(midi)));
}

export function noteTokenToMidi(token: NoteToken): Midi | null {
  if (token === REST_TOKEN) {
    return null;
  }

  const match = NOTE_TOKEN_REGEX.exec(token);
  if (!match) {
    throw new Error(`Invalid note token: ${token}`);
  }

  const [, letter, accidental, octaveString] = match;
  const normalized = `${letter.toUpperCase()}${
    accidental ? (accidental === "#" ? "#" : "b") : ""
  }`;
  const octave = Number.parseInt(octaveString, 10);

  if (Number.isNaN(octave) || octave < OCTAVE_MIN || octave > OCTAVE_MAX) {
    throw new Error(`Invalid octave for token: ${token}`);
  }

  const semitone = NOTE_NAME_TO_SEMITONE[normalized];
  if (semitone === undefined) {
    throw new Error(`Unknown pitch class for token: ${token}`);
  }

  return clampMidi((octave + 1) * 12 + semitone);
}

export function midiToNoteToken(midi: Midi | null): NoteToken {
  if (midi === null) {
    return REST_TOKEN;
  }

  const value = clampMidi(midi);
  const pc = value % 12;
  const octave = Math.floor(value / 12) - 1;
  const name = SEMITONE_TO_NOTE_NAME[pc];
  return `${name}${octave}`;
}

export function midiArrayToTokens(midis: (Midi | null)[]): NoteToken[] {
  return midis.map((midi) => midiToNoteToken(midi));
}

export function tokensToMidi(tokens: NoteToken[]): (Midi | null)[] {
  return tokens.map((token) => {
    try {
      return noteTokenToMidi(token);
    } catch {
      return null;
    }
  });
}

export function parseNoteText(
  text: string,
  expectedLength: number,
): { midis: (Midi | null)[]; invalidTokens: string[] } {
  const tokens = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 0);

  const paddedTokens: NoteToken[] = [...tokens];
  while (paddedTokens.length < expectedLength) {
    paddedTokens.push(REST_TOKEN);
  }

  const trimmedTokens = paddedTokens.slice(0, expectedLength);

  const invalidTokens: string[] = [];
  const midis = trimmedTokens.map((token) => {
    if (token === REST_TOKEN) {
      return null;
    }

    try {
      return noteTokenToMidi(token);
    } catch {
      invalidTokens.push(token);
      return null;
    }
  });

  return { midis, invalidTokens };
}

export function formatNoteText(midis: (Midi | null)[]): string {
  return midiArrayToTokens(midis).join(" ");
}

export const KEY_TO_PITCH_CLASS: Record<KeyName, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

export function transposePitchClass(pc: number, semitones: number): number {
  return (((pc + semitones) % 12) + 12) % 12;
}

export function midiForPitchClass(pc: number, octave: number): Midi {
  return clampMidi((octave + 1) * 12 + pc);
}

export function closestMidiToTarget(
  targetPc: number,
  reference: Midi,
  preferredOctave: number,
): Midi {
  const base = midiForPitchClass(targetPc, preferredOctave);
  let candidate = base;
  let distance = Math.abs(candidate - reference);

  while (candidate < reference - 6) {
    candidate += 12;
  }
  while (candidate > reference + 6) {
    candidate -= 12;
  }

  distance = Math.abs(candidate - reference);

  const altUp = candidate + 12;
  const altDown = candidate - 12;

  if (Math.abs(altUp - reference) < distance) {
    candidate = altUp;
    distance = Math.abs(candidate - reference);
  }

  if (Math.abs(altDown - reference) < distance) {
    candidate = altDown;
  }

  return clampMidi(candidate);
}
