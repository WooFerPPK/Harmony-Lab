import { describe, expect, it } from "vitest";

import { midiToNoteToken, noteTokenToMidi } from "@theory/notes";
import { getScalePitchClasses } from "@theory/scales";
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

  it("builds seventh chords from degrees", () => {
    expect(getChordPitchClasses("C", "major", 0)).toEqual([0, 4, 7, 11]);
    expect(getChordPitchClasses("C", "major", 4)).toEqual([7, 11, 2, 5]);
    expect(getChordPitchClasses("A", "minor", 0)).toEqual([9, 0, 4, 7]);
  });
});
