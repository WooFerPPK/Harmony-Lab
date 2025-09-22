import { create } from "zustand";
import type {
  Degree,
  Mode,
  PartName,
  PartNoteMap,
  Progression,
  Settings,
} from "@theory/notes";
import { formatNoteText, parseNoteText } from "@theory/notes";
import { buildProgression } from "@theory/progressions";
import { generateSequence } from "@engine/sequence";
import { ensureAudioContext } from "@engine/audioContext";
import { createMixer, type Mixer } from "@engine/mixer";
import { createSynth, type Synth } from "@engine/synth";
import { createScheduler, type Scheduler } from "@engine/scheduler";
import { createVisualizer, type VisualizerHandle } from "@engine/visualize";
import type { PresetPayload } from "@features/presets/localStorage";
import {
  exportPreset as serializePreset,
  importPreset as parsePreset,
  listPresets,
  loadPreset as loadPresetFromStorage,
  savePreset as savePresetToStorage,
} from "@features/presets/localStorage";

interface NoteTextMap {
  lead: string;
  arp: string;
  bass: string;
}

interface UserNotesMap {
  lead: (number | null)[] | null;
  arp: (number | null)[] | null;
  bass: (number | null)[] | null;
}

interface AppState {
  settings: Settings;
  progression: Progression;
  userNotes: UserNotesMap;
  generatedNotes: PartNoteMap;
  noteText: NoteTextMap;
  events: ReturnType<typeof generateSequence>["events"];
  visualizer: VisualizerHandle | null;
  playing: boolean;
  presets: PresetPayload[];
  updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void;
  updateProgression(degrees: Degree[]): void;
  generate(): void;
  start(): Promise<void>;
  stop(): void;
  setNoteText(part: PartName, value: string): void;
  applyNoteText(part: PartName): { invalidTokens: string[] };
  clearNotes(): void;
  setLockNotes(lock: boolean): void;
  refreshPresets(): void;
  savePreset(name: string): void;
  loadPreset(name: string): boolean;
  exportPreset(name: string): string | null;
  importPreset(serialized: string): void;
}

const DEFAULT_SETTINGS: Settings = {
  key: "C",
  mode: "major",
  bars: 8,
  bpm: 90,
  swing: 0.08,
  master: 0.8,
  cutoff: 1800,
  delayFB: 0.35,
  drive: 0.15,
  limiter: true,
  autoGain: true,
  nice: false,
  lockNotes: false,
};

const INITIAL_PROGRESSION = buildProgression(
  DEFAULT_SETTINGS.mode,
  DEFAULT_SETTINGS.bars,
);
const EMPTY_NOTES: UserNotesMap = { lead: null, arp: null, bass: null };
const INITIAL_SEQUENCE = generateSequence(
  DEFAULT_SETTINGS,
  INITIAL_PROGRESSION,
  EMPTY_NOTES,
);

const INITIAL_NOTE_TEXT: NoteTextMap = {
  lead: formatNoteText(INITIAL_SEQUENCE.generated.lead),
  arp: formatNoteText(INITIAL_SEQUENCE.generated.arp),
  bass: formatNoteText(INITIAL_SEQUENCE.generated.bass),
};

let mixer: Mixer | null = null;
let synth: Synth | null = null;
let scheduler: Scheduler | null = null;
let visualizer: VisualizerHandle | null = null;
let autoGainTimer: ReturnType<typeof setInterval> | null = null;

async function ensureEngine() {
  if (!mixer || !synth || !scheduler || !visualizer) {
    const context = await ensureAudioContext();
    mixer = createMixer(context);
    synth = createSynth(context, mixer);
    scheduler = createScheduler(context, synth);
    visualizer = createVisualizer(mixer);
  }
  if (!mixer || !synth || !scheduler || !visualizer) {
    throw new Error("Unable to initialize audio engine");
  }
  return { mixer, synth, scheduler, visualizer };
}

function stopAutoGainTimer() {
  if (autoGainTimer !== null) {
    globalThis.clearInterval(autoGainTimer);
    autoGainTimer = null;
  }
}

function startAutoGainTimer(currentMixer: Mixer) {
  autoGainTimer ??= globalThis.setInterval(() => {
    currentMixer.tickAutoGain();
  }, 120);
}

function syncProgression(
  mode: Mode,
  bars: 4 | 8 | 16,
  progression: Progression,
): Progression {
  const base = buildProgression(mode, bars);
  const degrees = [...progression.degrees.slice(0, bars)];
  while (degrees.length < bars) {
    degrees.push(base.degrees[degrees.length % base.degrees.length]);
  }
  return {
    bars,
    degrees,
  };
}

function deriveNoteText(notes: PartNoteMap): NoteTextMap {
  return {
    lead: formatNoteText(notes.lead),
    arp: formatNoteText(notes.arp),
    bass: formatNoteText(notes.bass),
  };
}

function cloneGeneratedNotes(notes: PartNoteMap): PartNoteMap {
  return {
    lead: [...notes.lead],
    arp: [...notes.arp],
    bass: [...notes.bass],
  };
}

function cloneUserNotes(notes: UserNotesMap): UserNotesMap {
  return {
    lead: notes.lead ? [...notes.lead] : null,
    arp: notes.arp ? [...notes.arp] : null,
    bass: notes.bass ? [...notes.bass] : null,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  progression: INITIAL_PROGRESSION,
  userNotes: { ...EMPTY_NOTES },
  generatedNotes: cloneGeneratedNotes(INITIAL_SEQUENCE.generated),
  noteText: INITIAL_NOTE_TEXT,
  events: [...INITIAL_SEQUENCE.events],
  visualizer: null,
  playing: false,
  presets: listPresets(),
  updateSetting: (key, value) => {
    set((state) => {
      const nextSettings: Settings = { ...state.settings };
      nextSettings[key] = value;
      let nextProgression = state.progression;
      if (key === "bars") {
        const barsValue = value as Settings["bars"];
        nextSettings.bars = barsValue;
        nextProgression = syncProgression(
          nextSettings.mode,
          barsValue,
          state.progression,
        );
      }
      if (key === "mode") {
        const modeValue = value as Mode;
        nextSettings.mode = modeValue;
        nextProgression = syncProgression(
          modeValue,
          nextSettings.bars,
          state.progression,
        );
      }
      if (mixer) {
        mixer.updateFromSettings(nextSettings);
      }
      if (scheduler) {
        scheduler.updateSettings(nextSettings);
      }
      return { settings: nextSettings, progression: nextProgression };
    });
    get().generate();
  },
  updateProgression: (degrees) => {
    set((state) => {
      const bars = state.settings.bars;
      const normalized = degrees.slice(0, bars);
      while (normalized.length < bars) {
        normalized.push(
          state.progression.degrees[normalized.length % state.progression.degrees.length],
        );
      }
      return {
        progression: { bars, degrees: normalized },
      };
    });
    get().generate();
  },
  generate: () => {
    const state = get();
    const sequence = generateSequence(state.settings, state.progression, state.userNotes);
    const noteText = state.settings.lockNotes
      ? state.noteText
      : deriveNoteText(sequence.generated);
    const nextUserNotes = state.settings.lockNotes
      ? state.userNotes
      : { lead: null, arp: null, bass: null };
    set({
      generatedNotes: sequence.generated,
      noteText,
      events: sequence.events,
      userNotes: nextUserNotes,
    });
    if (scheduler) {
      scheduler.setEvents(sequence.events);
    }
  },
  start: async () => {
    const state = get();
    const engine = await ensureEngine();
    engine.mixer.updateFromSettings(state.settings);
    scheduler?.start(state.events, state.settings);
    startAutoGainTimer(engine.mixer);
    set({ playing: true, visualizer: engine.visualizer });
  },
  stop: () => {
    scheduler?.stop();
    stopAutoGainTimer();
    set({ playing: false });
  },
  setNoteText: (part, value) => {
    set((state) => ({ noteText: { ...state.noteText, [part]: value } }));
  },
  applyNoteText: (part) => {
    const state = get();
    const bars = state.settings.bars;
    const expectedLength = bars * (part === "lead" ? 8 : part === "arp" ? 16 : 4);
    const { midis, invalidTokens } = parseNoteText(state.noteText[part], expectedLength);
    const userNotes = { ...state.userNotes, [part]: midis } as UserNotesMap;
    set({ userNotes });
    get().generate();
    return { invalidTokens };
  },
  clearNotes: () => {
    set({ userNotes: { lead: null, arp: null, bass: null } });
    const state = get();
    const noteText = deriveNoteText(state.generatedNotes);
    set({ noteText });
    get().generate();
  },
  setLockNotes: (lock) => {
    set((state) => ({ settings: { ...state.settings, lockNotes: lock } }));
  },
  refreshPresets: () => {
    set({ presets: listPresets() });
  },
  savePreset: (name) => {
    const state = get();
    const payload: PresetPayload = {
      name,
      createdAt: Date.now(),
      settings: state.settings,
      progression: state.progression,
      userNotes: cloneUserNotes(state.userNotes),
      generatedNotes: cloneGeneratedNotes(state.generatedNotes),
    };
    savePresetToStorage(payload);
    get().refreshPresets();
  },
  loadPreset: (name) => {
    const preset = loadPresetFromStorage(name);
    if (!preset) {
      return false;
    }
    const noteSource = {
      lead: preset.userNotes.lead ?? preset.generatedNotes.lead,
      arp: preset.userNotes.arp ?? preset.generatedNotes.arp,
      bass: preset.userNotes.bass ?? preset.generatedNotes.bass,
    };
    set({
      settings: preset.settings,
      progression: preset.progression,
      userNotes: cloneUserNotes(preset.userNotes),
      generatedNotes: cloneGeneratedNotes(preset.generatedNotes),
      noteText: deriveNoteText(noteSource),
    });
    get().generate();
    return true;
  },
  exportPreset: (name) => {
    const preset = loadPresetFromStorage(name);
    return preset ? serializePreset(preset) : null;
  },
  importPreset: (serialized) => {
    const parsed = parsePreset(serialized);
    savePresetToStorage(parsed);
    get().refreshPresets();
  },
}));
