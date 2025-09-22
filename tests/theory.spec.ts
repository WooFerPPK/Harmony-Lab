import { describe, expect, it } from "vitest";

import {
  closestMidiToTarget,
  formatNoteText,
  midiToNoteToken,
  noteTokenToMidi,
  parseNoteText,
} from "@theory/notes";
import { getPentatonicPitchClasses, getScalePitchClasses } from "@theory/scales";
import { getChordPitchClasses } from "@theory/chords";

describe("theory helpers", () => {
  it("round-trips midi and note tokens across octaves", () => {
    const tokens = ["C1", "Eb3", "F#4", "A5", "B7"];
    const midis = tokens.map((token) => noteTokenToMidi(token));
    const roundTrip = midis.map((midi) => midiToNoteToken(midi));
    expect(roundTrip).toEqual(tokens);
  });

  it("produces correct pitch classes for major and minor scales", () => {
    expect(getScalePitchClasses("C", "major")).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(getScalePitchClasses("A", "minor")).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it("derives pentatonic collections from the parent scale", () => {
    expect(getPentatonicPitchClasses("C", "major")).toEqual([0, 2, 4, 7, 9]);
    expect(getPentatonicPitchClasses("A", "minor")).toEqual([9, 0, 2, 4, 7]);
  });

  it("builds seventh chords from degrees", () => {
    expect(getChordPitchClasses("C", "major", 0)).toEqual([0, 4, 7, 11]);
    expect(getChordPitchClasses("C", "major", 4)).toEqual([7, 11, 2, 5]);
    expect(getChordPitchClasses("A", "minor", 0)).toEqual([9, 0, 4, 7]);
  });

  it("converts between note text and midi arrays with validation", () => {
    const input = "C4 D4 --- Eb4 H4";
    const { midis, invalidTokens } = parseNoteText(input, 6);
    expect(invalidTokens).toEqual(["H4"]);
    expect(midis.slice(0, 4)).toEqual([60, 62, null, 63]);
    expect(midis).toHaveLength(6);
    expect(formatNoteText(midis)).toEqual("C4 D4 --- Eb4 --- ---");
  });

  it("chooses midi pitches close to a reference note", () => {
    expect(closestMidiToTarget(0, 60, 4)).toBe(60);
    expect(closestMidiToTarget(0, 73, 4)).toBe(72);
    expect(closestMidiToTarget(0, 47, 3)).toBe(48);
    expect(closestMidiToTarget(7, 0, 4)).toBe(7);
  });
});
