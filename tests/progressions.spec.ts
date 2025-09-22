import { describe, expect, it } from "vitest";

import {
  buildProgression,
  normalizeProgression,
  validateProgression,
} from "@theory/progressions";
import type { Progression } from "@theory/notes";

describe("progression utilities", () => {
  it("builds looping progressions for any supported bar length", () => {
    expect(buildProgression("major", 4)).toEqual({ bars: 4, degrees: [0, 4, 5, 3] });
    expect(buildProgression("minor", 8).degrees).toHaveLength(8);
    expect(buildProgression("minor", 16).degrees.slice(0, 4)).toEqual([0, 3, 4, 3]);
  });

  it("normalizes user progressions to match the target bars", () => {
    const user: Progression = { bars: 4, degrees: [0, 1, 2] };
    const normalized = normalizeProgression(user, "major");
    expect(normalized.degrees).toEqual([0, 1, 2, 3]);

    const extended = normalizeProgression({ bars: 8, degrees: [0, 4, 5, 3] }, "minor");
    expect(extended.degrees).toHaveLength(8);
    expect(new Set(extended.degrees)).toContain(0);
  });

  it("validates the expected number of bars", () => {
    expect(validateProgression({ bars: 4, degrees: [0, 1, 2, 3] }, 4)).toBe(true);
    expect(validateProgression({ bars: 4, degrees: [0, 1, 2] }, 4)).toBe(false);
  });
});
