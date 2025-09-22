import { describe, expect, it } from "vitest";

import { stepDurationSeconds, stepToTime } from "@engine/scheduler";

describe("scheduler timing", () => {
  it("maps steps to seconds without swing", () => {
    const bpm = 120;
    const base = stepDurationSeconds(bpm);
    expect(stepToTime(0, bpm, 0)).toBeCloseTo(0);
    expect(stepToTime(1, bpm, 0)).toBeCloseTo(base);
    expect(stepToTime(4, bpm, 0)).toBeCloseTo(base * 4);
  });

  it("delays off-16ths when swing is applied", () => {
    const bpm = 100;
    const base = stepDurationSeconds(bpm);
    const swung = stepToTime(1, bpm, 0.2);
    expect(swung).toBeGreaterThan(base);
    const followingStep = stepToTime(2, bpm, 0.2);
    expect(followingStep - swung).toBeCloseTo(base * (1 - 0.2), 5);
    const nextDownbeat = stepToTime(4, bpm, 0.2);
    expect(nextDownbeat).toBeCloseTo(base * 4, 5);
  });
});
