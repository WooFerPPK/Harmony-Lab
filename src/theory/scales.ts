import type { Mode } from "./notes";
import { KEY_TO_PITCH_CLASS, transposePitchClass } from "./notes";

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

export function getScalePitchClasses(key: string, mode: Mode): number[] {
  const rootPc = KEY_TO_PITCH_CLASS[key as keyof typeof KEY_TO_PITCH_CLASS];
  const intervals = mode === "major" ? MAJOR_INTERVALS : NATURAL_MINOR_INTERVALS;
  return intervals.map((interval) => transposePitchClass(rootPc, interval));
}

export function getPentatonicPitchClasses(key: string, mode: Mode): number[] {
  const scale = getScalePitchClasses(key, mode);
  return mode === "major"
    ? [scale[0], scale[1], scale[2], scale[4], scale[5]]
    : [scale[0], scale[2], scale[3], scale[4], scale[6]];
}
