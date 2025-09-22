import type { Midi, PartName, PartNoteMap, Progression, Settings } from "@theory/notes";

const STORAGE_KEY = "harmony-lab-presets";

export interface PresetPayload {
  name: string;
  createdAt: number;
  settings: Settings;
  progression: Progression;
  userNotes: Record<PartName, (Midi | null)[] | null>;
  generatedNotes: PartNoteMap;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readPresets(): PresetPayload[] {
  const storage = safeStorage();
  if (!storage) {
    return [];
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as PresetPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePresets(presets: PresetPayload[]) {
  const storage = safeStorage();
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function savePreset(payload: PresetPayload) {
  const presets = readPresets();
  const filtered = presets.filter((preset) => preset.name !== payload.name);
  filtered.push({ ...payload, createdAt: Date.now() });
  writePresets(filtered);
}

export function loadPreset(name: string): PresetPayload | null {
  const presets = readPresets();
  return presets.find((preset) => preset.name === name) ?? null;
}

export function listPresets(): PresetPayload[] {
  return readPresets().sort((a, b) => b.createdAt - a.createdAt);
}

export function deletePreset(name: string) {
  const presets = readPresets().filter((preset) => preset.name !== name);
  writePresets(presets);
}

export function exportPreset(payload: PresetPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function importPreset(serialized: string): PresetPayload {
  const parsed = JSON.parse(serialized) as PresetPayload;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid preset format");
  }
  return parsed;
}
