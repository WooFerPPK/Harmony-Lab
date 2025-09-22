import { getChordPitchClasses } from "@theory/chords";
import { getPentatonicPitchClasses } from "@theory/scales";
import type {
  Degree,
  PartName,
  PartNoteMap,
  Progression,
  Settings,
  NoteEvent,
} from "@theory/notes";
import { closestMidiToTarget, midiForPitchClass } from "@theory/notes";

const STEPS_PER_BAR = 16;
const PART_STEPS: Record<PartName, number> = {
  bass: 4,
  arp: 16,
  lead: 8,
};

export interface SequenceResult {
  events: NoteEvent[];
  generated: PartNoteMap;
}

function ensureChord(key: string, mode: "major" | "minor", degree: Degree): number[] {
  return getChordPitchClasses(key, mode, degree, true);
}

function toMidi(pc: number, last: number | null, preferredOctave: number): number {
  if (last === null) {
    return midiForPitchClass(pc, preferredOctave);
  }
  return closestMidiToTarget(pc, last, preferredOctave);
}

function generateBass(chords: number[][], bars: number): (number | null)[] {
  const result: (number | null)[] = [];
  let last: number | null = null;
  for (let bar = 0; bar < bars; bar += 1) {
    const chord = chords[bar];
    const rootPc = chord[0];
    const fifthPc = (rootPc + 7) % 12;
    const rootMidi = toMidi(rootPc, last, 2);
    const fifthMidi = closestMidiToTarget(fifthPc, rootMidi, 2);
    result.push(rootMidi, rootMidi, fifthMidi, rootMidi);
    last = rootMidi;
  }
  return result;
}

function generateArp(chords: number[][], bars: number): (number | null)[] {
  const result: (number | null)[] = [];
  let last: number | null = null;
  const pattern = [0, 2, 1, 3];
  for (let bar = 0; bar < bars; bar += 1) {
    const chord = chords[bar];
    for (let step = 0; step < STEPS_PER_BAR; step += 1) {
      const tone = chord[pattern[step % pattern.length] % chord.length];
      const preferredOctave = 4 + Math.floor(step / 16);
      const midi = toMidi(tone, last, preferredOctave);
      result.push(midi);
      last = midi;
    }
  }
  return result;
}

function generateLead(
  chords: number[][],
  pentatonic: number[],
  bars: number,
): (number | null)[] {
  const result: (number | null)[] = [];
  let last: number | null = null;
  for (let bar = 0; bar < bars; bar += 1) {
    const chord = chords[bar];
    const pattern: (number | null)[] = [
      chord[0],
      null,
      chord[2 % chord.length],
      pentatonic[(bar + 1) % pentatonic.length],
      chord[3 % chord.length],
      null,
      pentatonic[(bar + 2) % pentatonic.length],
      chord[1 % chord.length],
    ];
    for (let step = 0; step < PART_STEPS.lead; step += 1) {
      const tone = pattern[step % pattern.length];
      if (tone === null) {
        result.push(null);
        continue;
      }
      const midi = toMidi(tone, last, 5);
      result.push(midi);
      last = midi;
    }
  }
  return result;
}

function notesToEvents(
  part: PartName,
  notes: (number | null)[],
  stepsPerNote: number,
): NoteEvent[] {
  const events: NoteEvent[] = [];
  let stepIndex = 0;
  let idx = 0;
  const stepSize = stepsPerNote;
  while (idx < notes.length) {
    const midi = notes[idx];
    if (midi === null) {
      idx += 1;
      stepIndex += stepSize;
      continue;
    }
    let duration = stepSize;
    let lookahead = idx + 1;
    while (lookahead < notes.length && notes[lookahead] === midi) {
      duration += stepSize;
      lookahead += 1;
    }
    events.push({ part, step: stepIndex, durSteps: duration, midi });
    idx = lookahead;
    stepIndex += duration;
  }
  return events;
}

function ensureLength(
  source: (number | null)[] | null,
  targetLength: number,
): (number | null)[] | null {
  if (!source) {
    return null;
  }
  const copy = [...source];
  if (copy.length >= targetLength) {
    return copy.slice(0, targetLength);
  }
  while (copy.length < targetLength) {
    copy.push(null);
  }
  return copy;
}

export function generateSequence(
  settings: Settings,
  progression: Progression,
  userNotes: Record<PartName, (number | null)[] | null>,
): SequenceResult {
  const bars = settings.bars;
  const degrees: Degree[] = [];
  for (let i = 0; i < bars; i += 1) {
    degrees.push(progression.degrees[i % progression.degrees.length]);
  }

  const chords = degrees.map((degree) =>
    ensureChord(settings.key, settings.mode, degree),
  );
  const pentatonic = getPentatonicPitchClasses(settings.key, settings.mode);

  const generated: PartNoteMap = {
    bass: generateBass(chords, bars),
    arp: generateArp(chords, bars),
    lead: generateLead(chords, pentatonic, bars),
  };

  const sequences: Record<PartName, (number | null)[]> = {
    bass: ensureLength(userNotes.bass, bars * PART_STEPS.bass) ?? generated.bass,
    arp: ensureLength(userNotes.arp, bars * PART_STEPS.arp) ?? generated.arp,
    lead: ensureLength(userNotes.lead, bars * PART_STEPS.lead) ?? generated.lead,
  };

  const events: NoteEvent[] = [];
  (Object.keys(sequences) as PartName[]).forEach((part) => {
    const stepsPerNote = STEPS_PER_BAR / PART_STEPS[part];
    events.push(...notesToEvents(part, sequences[part], stepsPerNote));
  });

  events.sort((a, b) => a.step - b.step);

  return {
    events,
    generated,
  };
}
