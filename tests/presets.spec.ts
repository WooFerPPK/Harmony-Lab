import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deletePreset,
  exportPreset,
  importPreset,
  listPresets,
  loadPreset,
  savePreset,
} from "@features/presets/localStorage";
import type { PresetPayload } from "@features/presets/localStorage";

const BASE_PRESET: Omit<PresetPayload, "name" | "createdAt"> = {
  settings: {
    key: "C",
    mode: "major",
    bars: 4,
    bpm: 100,
    swing: 0.1,
    master: 0.8,
    cutoff: 1800,
    delayFB: 0.3,
    drive: 0.2,
    limiter: true,
    autoGain: true,
    nice: false,
    lockNotes: false,
    synthStyle: "modern",
  },
  progression: { bars: 4, degrees: [0, 4, 5, 3] },
  userNotes: { lead: null, arp: null, bass: null },
  generatedNotes: {
    lead: [72, null, 74, null],
    arp: [60, 64, 67, 72],
    bass: [36, null, null, 36],
  },
};

describe("preset storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists, lists, and loads presets", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1).mockReturnValueOnce(2);

    savePreset({ ...BASE_PRESET, name: "Warm Pad", createdAt: 0 });
    savePreset({ ...BASE_PRESET, name: "Bright Lead", createdAt: 0 });

    const listed = listPresets();
    expect(listed.map((preset) => preset.name)).toEqual(["Bright Lead", "Warm Pad"]);

    const loaded = loadPreset("Warm Pad");
    expect(loaded?.settings.bpm).toBe(100);
    expect(loaded?.createdAt).toBe(1);

    deletePreset("Warm Pad");
    expect(loadPreset("Warm Pad")).toBeNull();

    nowSpy.mockRestore();
  });

  it("exports and imports preset payloads", () => {
    const preset = { ...BASE_PRESET, name: "Export", createdAt: 123 };
    const serialized = exportPreset(preset as PresetPayload);
    expect(serialized).toContain("Export");

    const parsed = importPreset(serialized);
    expect(parsed.name).toBe("Export");
    expect(parsed.createdAt).toBe(123);
    expect(() => importPreset("not json")).toThrow();
    expect(() => importPreset("null")).toThrow();
  });
});
