import { describe, expect, it } from "vitest";

import { generateSequence } from "@engine/sequence";
import { buildProgression } from "@theory/progressions";
import type { Settings } from "@theory/notes";

const BASE_SETTINGS: Settings = {
  key: "C",
  mode: "major",
  bars: 4,
  bpm: 90,
  swing: 0,
  master: 0.8,
  cutoff: 1800,
  delayFB: 0.3,
  drive: 0.2,
  limiter: true,
  autoGain: true,
  nice: false,
  lockNotes: false,
};

const EMPTY_USER_NOTES = { lead: null, arp: null, bass: null };

describe("sequence generation", () => {
  const baseProgression = buildProgression(BASE_SETTINGS.mode, BASE_SETTINGS.bars);
  const parts = ["bass", "arp", "lead"] as const;
  const STEP_SIZES: Record<(typeof parts)[number], number> = {
    bass: 4,
    arp: 1,
    lead: 2,
  };

  const assertCounts = (bars: 4 | 8 | 16) => {
    const settings = { ...BASE_SETTINGS, bars } as Settings;
    const progression = buildProgression(settings.mode, settings.bars);
    const sequence = generateSequence(settings, progression, EMPTY_USER_NOTES);
    expect(sequence.generated.bass).toHaveLength(bars * 4);
    expect(sequence.generated.arp).toHaveLength(bars * 16);
    expect(sequence.generated.lead).toHaveLength(bars * 8);

    const totalSteps = bars * 16;
    parts.forEach((part) => {
      const events = sequence.events.filter((event) => event.part === part);
      const sum = events.reduce((acc, event) => acc + event.durSteps, 0);
      const expectedActive = sequence.generated[part].reduce<number>((acc, value) => {
        return acc + (value === null ? 0 : STEP_SIZES[part]);
      }, 0);
      expect(sum).toBe(expectedActive);
      const lastEventEnd = events.reduce((acc, event) => {
        return Math.max(acc, event.step + event.durSteps);
      }, 0);
      expect(lastEventEnd).toBeLessThanOrEqual(totalSteps);
    });
  };

  it("produces the correct amount of material for 4/8/16 bars", () => {
    assertCounts(4);
    assertCounts(8);
    assertCounts(16);
  });

  it("uses user notes when provided", () => {
    const settings = { ...BASE_SETTINGS };
    const userLead = Array(settings.bars * 8).fill(72);
    const userNotes = { lead: userLead, arp: null, bass: null };
    const sequence = generateSequence(settings, baseProgression, userNotes);
    const leadEvents = sequence.events.filter((event) => event.part === "lead");
    expect(leadEvents[0]?.midi).toBe(72);
    expect(leadEvents[0]?.durSteps).toBe(settings.bars * 16);
  });

  it("keeps generated notes when user notes are absent", () => {
    const sequence = generateSequence(BASE_SETTINGS, baseProgression, EMPTY_USER_NOTES);
    expect(sequence.generated.lead.some((value) => value !== null)).toBe(true);
  });

  it("normalizes user-provided material to the bar length", () => {
    const settings = { ...BASE_SETTINGS };
    const userLead = Array(5).fill(72);
    const userArp = Array(settings.bars * 16 + 8).fill(60);
    const userNotes = { lead: userLead, arp: userArp, bass: null };
    const sequence = generateSequence(settings, baseProgression, userNotes);

    const leadEvents = sequence.events.filter((event) => event.part === "lead");
    expect(leadEvents[0]?.durSteps).toBe(10);
    const maxArpStep = Math.max(
      ...sequence.events
        .filter((event) => event.part === "arp")
        .map((event) => event.step + event.durSteps),
    );
    expect(maxArpStep).toBeLessThanOrEqual(settings.bars * 16);
  });
});
