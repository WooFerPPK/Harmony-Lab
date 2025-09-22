import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Mixer } from "@engine/mixer";
import type { Scheduler } from "@engine/scheduler";
import type { Synth } from "@engine/synth";
import type { VisualizerHandle } from "@engine/visualize";
import type { NoteEvent, PartNoteMap, Settings } from "@theory/notes";

const ensureAudioContextMock = vi.fn<() => Promise<AudioContext>>();
const createMixerMock = vi.fn();
const createSynthMock = vi.fn();
const createSchedulerMock = vi.fn();
const createVisualizerMock = vi.fn();
const generateSequenceMock = vi.fn((settings: Settings) => {
  const bars = settings.bars;
  const lead = Array.from({ length: bars * 8 }, (_, index) =>
    index % 3 === 2 ? null : 70 + index,
  );
  const arp = Array.from({ length: bars * 16 }, (_, index) => 60 + (index % 5));
  const bass = Array.from({ length: bars * 4 }, () => 40);
  const events: NoteEvent[] = [
    { part: "lead", step: 0, durSteps: 2, midi: 70 },
    { part: "bass", step: 0, durSteps: 4, midi: 40 },
  ];
  return {
    generated: { lead, arp, bass } satisfies PartNoteMap,
    events,
  };
});

vi.mock("@engine/audioContext", () => ({
  ensureAudioContext: ensureAudioContextMock,
}));

vi.mock("@engine/mixer", () => ({
  createMixer: createMixerMock,
}));

vi.mock("@engine/synth", () => ({
  createSynth: createSynthMock,
}));

vi.mock("@engine/scheduler", () => ({
  createScheduler: createSchedulerMock,
}));

vi.mock("@engine/visualize", () => ({
  createVisualizer: createVisualizerMock,
}));

vi.mock("@engine/sequence", () => ({
  generateSequence: generateSequenceMock,
}));

const analyserStub = {
  fftSize: 32,
  getFloatTimeDomainData: vi.fn(),
} as unknown as AnalyserNode;

const gainNodeStub = {
  gain: { value: 0.8, setTargetAtTime: vi.fn() },
} as unknown as GainNode;

describe("app store", () => {
  let mixerMock: Mixer;
  let mixerSpies: {
    updateFromSettings: ReturnType<typeof vi.fn>;
    tickAutoGain: ReturnType<typeof vi.fn>;
  };
  let synthMock: Synth;
  let synthSpies: {
    play: ReturnType<typeof vi.fn>;
    playDrums: ReturnType<typeof vi.fn>;
    stopAll: ReturnType<typeof vi.fn>;
  };
  let schedulerMock: Scheduler;
  let schedulerSpies: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    setEvents: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
    isRunning: ReturnType<typeof vi.fn>;
    setOnNote: ReturnType<typeof vi.fn>;
  };
  let visualizerMock: VisualizerHandle;
  const audioContext = {
    state: "running" as AudioContextState,
    resume: vi.fn(),
  } as unknown as AudioContext;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();

    mixerSpies = {
      updateFromSettings: vi.fn(),
      tickAutoGain: vi.fn(),
    };
    mixerMock = {
      input: gainNodeStub,
      master: gainNodeStub,
      analyser: analyserStub,
      updateFromSettings: mixerSpies.updateFromSettings,
      tickAutoGain: mixerSpies.tickAutoGain,
    } as unknown as Mixer;
    synthSpies = {
      play: vi.fn(),
      playDrums: vi.fn(),
      stopAll: vi.fn(),
    };
    synthMock = synthSpies as unknown as Synth;
    schedulerSpies = {
      start: vi.fn(),
      stop: vi.fn(),
      setEvents: vi.fn(),
      updateSettings: vi.fn(),
      isRunning: vi.fn(() => true),
      setOnNote: vi.fn(),
    };
    schedulerMock = schedulerSpies as unknown as Scheduler;
    visualizerMock = {
      analyser: analyserStub,
      getWaveform: vi.fn(() => new Float32Array(32)),
    } as unknown as VisualizerHandle;

    ensureAudioContextMock.mockResolvedValue(audioContext);
    createMixerMock.mockReturnValue(mixerMock);
    createSynthMock.mockReturnValue(synthMock);
    createSchedulerMock.mockReturnValue(schedulerMock);
    createVisualizerMock.mockReturnValue(visualizerMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function loadStore() {
    const module = await import("@store/useAppStore");
    return module.useAppStore;
  }

  it("generates material and derives note text", async () => {
    const useAppStore = await loadStore();
    const state = useAppStore.getState();
    const beforeCalls = generateSequenceMock.mock.calls.length;
    state.generate();
    expect(generateSequenceMock.mock.calls.length).toBe(beforeCalls + 1);
    const nextState = useAppStore.getState();
    expect(nextState.generatedNotes.lead).toHaveLength(nextState.settings.bars * 8);
    expect(nextState.noteText.lead).toBeTruthy();
  });

  it("applies user note text and tracks invalid tokens when locked", async () => {
    const useAppStore = await loadStore();
    const { setLockNotes, setNoteText, applyNoteText } = useAppStore.getState();
    setLockNotes(true);
    setNoteText("lead", "C4 BadToken D4");
    const result = applyNoteText("lead");
    expect(result.invalidTokens).toEqual(["BadToken"]);
    const userNotes = useAppStore.getState().userNotes.lead;
    expect(userNotes).not.toBeNull();
    expect(userNotes?.filter((value) => value !== null)).toHaveLength(2);
  });

  it("clears user notes and refreshes derived text", async () => {
    const useAppStore = await loadStore();
    const store = useAppStore.getState();
    store.setLockNotes(true);
    store.setNoteText("lead", "C4 D4");
    store.applyNoteText("lead");
    store.clearNotes();
    expect(useAppStore.getState().userNotes.lead).toBeNull();
    expect(useAppStore.getState().noteText.lead).toBeTruthy();
  });

  it("starts and stops the audio engine", async () => {
    vi.useFakeTimers();
    const useAppStore = await loadStore();
    const store = useAppStore.getState();
    await store.start();
    expect(ensureAudioContextMock).toHaveBeenCalled();
    expect(createMixerMock).toHaveBeenCalled();
    expect(createSynthMock).toHaveBeenCalledWith(audioContext, mixerMock);
    expect(createSchedulerMock).toHaveBeenCalledWith(audioContext, synthMock);
    expect(schedulerSpies.setOnNote).toHaveBeenCalled();
    const startedWith = schedulerSpies.start.mock.calls.at(-1);
    expect(startedWith?.[0]).toEqual(useAppStore.getState().events);
    expect(startedWith?.[1]).toEqual(useAppStore.getState().settings);
    expect(useAppStore.getState().playing).toBe(true);

    vi.advanceTimersByTime(250);
    expect(mixerSpies.tickAutoGain).toHaveBeenCalled();

    store.stop();
    expect(schedulerSpies.stop).toHaveBeenCalled();
    expect(useAppStore.getState().playing).toBe(false);
  });

  it("updates settings and propagates changes while running", async () => {
    vi.useFakeTimers();
    const useAppStore = await loadStore();
    const store = useAppStore.getState();
    await store.start();
    schedulerSpies.updateSettings.mockClear();
    schedulerSpies.setEvents.mockClear();

    store.updateSetting("bpm", 128);
    expect(generateSequenceMock).toHaveBeenCalled();
    expect(schedulerSpies.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ bpm: 128 }),
    );
    expect(schedulerSpies.setEvents).toHaveBeenCalled();
  });

  it("saves and loads presets via local storage helpers", async () => {
    const useAppStore = await loadStore();
    const store = useAppStore.getState();
    store.savePreset("Template");
    expect(
      useAppStore.getState().presets.some((preset) => preset.name === "Template"),
    ).toBe(true);

    const loaded = store.loadPreset("Template");
    expect(loaded).toBe(true);
    expect(generateSequenceMock).toHaveBeenCalled();

    const exported = store.exportPreset("Template");
    expect(exported).toContain("Template");

    store.importPreset(exported ?? "{}");
    expect(useAppStore.getState().presets.length).toBeGreaterThan(0);
  });
});
