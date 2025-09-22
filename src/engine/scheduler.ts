import type { NoteEvent, Settings } from "@theory/notes";
import type { Synth } from "./synth";

const LOOKAHEAD = 0.25; // seconds
const TICK_INTERVAL = 0.05; // seconds
const STEPS_PER_BAR = 16;

export function stepDurationSeconds(bpm: number): number {
  return 60 / bpm / 4;
}

export function stepToTime(step: number, bpm: number, swing: number): number {
  const base = stepDurationSeconds(bpm);
  const beatPosition = step % 4;
  const swingOffset = beatPosition % 2 === 1 ? base * swing : 0;
  return step * base + swingOffset;
}

interface ScheduleState {
  events: NoteEvent[];
  settings: Settings;
  startTime: number;
  loopSteps: number;
  nextEventIndex: number;
  loopCount: number;
  nextDrumStep: number;
}

export interface Scheduler {
  start(events: NoteEvent[], settings: Settings): void;
  stop(): void;
  setEvents(events: NoteEvent[]): void;
  updateSettings(settings: Settings): void;
  isRunning(): boolean;
  setOnNote(listener: (event: NoteEvent | null) => void): void;
}

export function createScheduler(context: AudioContext, synth: Synth): Scheduler {
  let state: ScheduleState | null = null;
  let intervalId: number | null = null;
  let cachedEvents: NoteEvent[] = [];
  let cachedSettings: Settings | null = null;
  let noteListener: ((event: NoteEvent | null) => void) | null = null;

  function scheduleLoop() {
    if (!state) {
      return;
    }
    const { events, settings, startTime, loopSteps } = state;
    const horizon = context.currentTime + LOOKAHEAD;

    while (true) {
      const absoluteStep = state.nextDrumStep;
      const time = startTime + stepToTime(absoluteStep, settings.bpm, settings.swing);
      if (time > horizon) {
        break;
      }
      synth.playDrums(absoluteStep % loopSteps, time, settings);
      state.nextDrumStep += 1;
    }

    while (events.length > 0) {
      const event = events[state.nextEventIndex];
      const absoluteStep = event.step + state.loopCount * loopSteps;
      const time = startTime + stepToTime(absoluteStep, settings.bpm, settings.swing);
      if (time > horizon) {
        break;
      }
      noteListener?.({ ...event });
      synth.play(event, time, settings);
      state.nextEventIndex += 1;
      if (state.nextEventIndex >= events.length) {
        state.nextEventIndex = 0;
        state.loopCount += 1;
      }
    }
  }

  function resetSchedule(events: NoteEvent[], settings: Settings) {
    const loopSteps = settings.bars * STEPS_PER_BAR;
    cachedEvents = [...events].sort((a, b) => a.step - b.step);
    cachedSettings = settings;
    state = {
      events: cachedEvents,
      settings,
      startTime: context.currentTime,
      loopSteps,
      nextEventIndex: 0,
      loopCount: 0,
      nextDrumStep: 0,
    };
  }

  function start(events: NoteEvent[], settings: Settings) {
    resetSchedule(events, settings);
    synth.stopAll();
    noteListener?.(null);
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = globalThis.setInterval(
      scheduleLoop,
      TICK_INTERVAL * 1000,
    ) as unknown as number;
    scheduleLoop();
  }

  function stop() {
    if (intervalId !== null) {
      globalThis.clearInterval(intervalId);
      intervalId = null;
    }
    synth.stopAll();
    state = null;
    noteListener?.(null);
  }

  function setEvents(events: NoteEvent[]) {
    cachedEvents = [...events].sort((a, b) => a.step - b.step);
    if (state && cachedSettings) {
      state.events = cachedEvents;
      state.nextEventIndex = 0;
      state.loopCount = 0;
      state.nextDrumStep = 0;
      state.startTime = context.currentTime;
    }
    noteListener?.(null);
  }

  function updateSettings(settings: Settings) {
    cachedSettings = settings;
    if (state) {
      state.settings = settings;
      state.loopSteps = settings.bars * STEPS_PER_BAR;
      state.startTime = context.currentTime;
      state.nextEventIndex = 0;
      state.loopCount = 0;
      state.nextDrumStep = 0;
    }
    noteListener?.(null);
  }

  function isRunning() {
    return intervalId !== null;
  }

  function setOnNote(listener: (event: NoteEvent | null) => void) {
    noteListener = listener;
    noteListener?.(null);
  }

  return {
    start,
    stop,
    setEvents,
    updateSettings,
    isRunning,
    setOnNote,
  };
}
