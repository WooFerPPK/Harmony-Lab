import type { Degree, Mode, Progression } from "./notes";

const MAJOR_PATTERNS: Degree[][] = [
  [0, 4, 5, 3], // I V vi IV
  [0, 5, 3, 4], // I vi IV V
  [0, 3, 4, 4], // I IV V V
];

const MINOR_PATTERNS: Degree[][] = [
  [0, 3, 4, 3], // i iv V iv
  [0, 5, 3, 4], // i VI iv V
  [0, 4, 5, 4], // i V VI V
];

export function buildProgression(mode: Mode, bars: 4 | 8 | 16): Progression {
  const patterns = mode === "major" ? MAJOR_PATTERNS : MINOR_PATTERNS;
  const result: Degree[] = [];
  let patternIndex = 0;
  while (result.length < bars) {
    const pattern = patterns[patternIndex % patterns.length];
    result.push(...pattern);
    patternIndex += 1;
  }
  return { bars, degrees: result.slice(0, bars) };
}

export function normalizeProgression(progression: Progression, mode: Mode): Progression {
  const targetBars = progression.bars as 4 | 8 | 16;
  const base = buildProgression(mode, targetBars);
  const degrees = [...progression.degrees];
  while (degrees.length < targetBars) {
    degrees.push(...base.degrees.slice(degrees.length, targetBars));
  }
  return { bars: targetBars, degrees: degrees.slice(0, targetBars) };
}

export function validateProgression(progression: Progression, bars: 4 | 8 | 16): boolean {
  return progression.degrees.length === bars;
}
