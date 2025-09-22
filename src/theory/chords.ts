import { type Degree, type Mode, transposePitchClass } from "./notes";
import { getScalePitchClasses } from "./scales";

interface ChordQuality {
  triad: number[];
  seventh: number;
}

const MAJOR_QUALITIES: ChordQuality[] = [
  { triad: [0, 4, 7], seventh: 11 },
  { triad: [0, 3, 7], seventh: 10 },
  { triad: [0, 3, 7], seventh: 10 },
  { triad: [0, 4, 7], seventh: 11 },
  { triad: [0, 4, 7], seventh: 10 },
  { triad: [0, 3, 7], seventh: 10 },
  { triad: [0, 3, 6], seventh: 10 },
];

const MINOR_QUALITIES: ChordQuality[] = [
  { triad: [0, 3, 7], seventh: 10 },
  { triad: [0, 3, 7], seventh: 10 },
  { triad: [0, 4, 7], seventh: 11 },
  { triad: [0, 3, 7], seventh: 10 },
  { triad: [0, 4, 7], seventh: 10 },
  { triad: [0, 4, 7], seventh: 11 },
  { triad: [0, 3, 6], seventh: 10 },
];

export function getChordPitchClasses(
  key: string,
  mode: Mode,
  degree: Degree,
  includeSeventh = true,
): number[] {
  const scale = getScalePitchClasses(key, mode);
  const rootPc = scale[degree];
  const qualities = mode === "major" ? MAJOR_QUALITIES : MINOR_QUALITIES;
  const quality = qualities[degree];
  const chord = quality.triad.map((interval) => transposePitchClass(rootPc, interval));
  if (includeSeventh) {
    chord.push(transposePitchClass(rootPc, quality.seventh));
  }
  return chord;
}
