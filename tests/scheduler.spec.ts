import { describe, expect, it } from "vitest";

import { createScheduler, stepDurationSeconds, stepToTime } from "@engine/scheduler";
import type { NoteEvent, Settings } from "@theory/notes";

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

describe("scheduler runtime", () => {
  const settings: Settings = {
    key: "C",
    mode: "major",
    bars: 4,
    bpm: 120,
    swing: 0.1,
    master: 0.8,
    cutoff: 1800,
    delayFB: 0.3,
    drive: 0.2,
    limiter: true,
    autoGain: true,
    nice: false,
    lockNotes: false,
  };

  const events: NoteEvent[] = [
    { part: "lead", step: 0, durSteps: 4, midi: 60 },
    { part: "lead", step: 4, durSteps: 4, midi: 62 },
  ];

  function createContext() {
    const state = { currentTime: 0 };
    return { state, context: state as unknown as AudioContext };
  }

  it("plays events and drums while running", () => {
    vi.useFakeTimers();
    const synth = {
      play: vi.fn(),
      playDrums: vi.fn(),
      stopAll: vi.fn(),
    };
    const { state, context } = createContext();
    const scheduler = createScheduler(context, synth as unknown as typeof synth);

    scheduler.start(events, settings);
    expect(synth.stopAll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(50);
    state.currentTime += 0.05;

    expect(synth.play).toHaveBeenCalledWith(
      events[0],
      expect.any(Number),
      expect.objectContaining({ bpm: 120 }),
    );
    expect(synth.playDrums).toHaveBeenCalled();

    synth.play.mockClear();

    for (let i = 0; i < 6; i += 1) {
      vi.advanceTimersByTime(50);
      state.currentTime += 0.05;
    }

    expect(synth.play).toHaveBeenCalledWith(
      events[1],
      expect.any(Number),
      expect.objectContaining({ bpm: 120 }),
    );

    scheduler.stop();
    expect(synth.stopAll).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it("resets state when events or settings change", () => {
    vi.useFakeTimers();
    const synth = {
      play: vi.fn(),
      playDrums: vi.fn(),
      stopAll: vi.fn(),
    };
    const { state, context } = createContext();
    const scheduler = createScheduler(context, synth as unknown as typeof synth);

    scheduler.start(events, settings);
    vi.advanceTimersByTime(50);
    state.currentTime += 0.05;
    synth.play.mockClear();

    const nextEvents: NoteEvent[] = [{ part: "lead", step: 0, durSteps: 8, midi: 70 }];
    scheduler.setEvents(nextEvents);
    vi.advanceTimersByTime(50);
    state.currentTime += 0.05;
    expect(synth.play).toHaveBeenCalledWith(
      nextEvents[0],
      expect.any(Number),
      expect.objectContaining({ bpm: 120 }),
    );

    synth.play.mockClear();
    const nextSettings: Settings = { ...settings, bpm: 90 };
    scheduler.updateSettings(nextSettings);
    vi.advanceTimersByTime(50);
    state.currentTime += 0.05;
    expect(synth.play).toHaveBeenCalledWith(
      nextEvents[0],
      expect.any(Number),
      nextSettings,
    );

    scheduler.stop();
    vi.useRealTimers();
  });
});
