import type { ChangeEvent } from "react";

import { useAppStore } from "@store/useAppStore";

import "./ControlsPanel.scss";

const KEY_OPTIONS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;
const MODE_OPTIONS = ["major", "minor"] as const;
const BAR_OPTIONS = [4, 8, 16] as const;

function findKeyOption(
  value: string,
  fallback: (typeof KEY_OPTIONS)[number],
): (typeof KEY_OPTIONS)[number] {
  return KEY_OPTIONS.find((option) => option === value) ?? fallback;
}

export function ControlsPanel() {
  const settings = useAppStore((state) => state.settings);
  const updateSetting = useAppStore((state) => state.updateSetting);

  const handleNumberChange = (
    event: ChangeEvent<HTMLInputElement>,
    key: "bpm" | "swing" | "master",
  ) => {
    const value = Number.parseFloat(event.target.value);
    updateSetting(key, Number.isFinite(value) ? value : settings[key]);
  };

  return (
    <section className="controls panel" aria-label="Generator controls">
      <h2 className="panel__title">Controls</h2>
      <div className="controls__grid">
        <label className="controls__field tooltip" title="Choose the tonal center">
          <span className="controls__label">Key</span>
          <select
            value={settings.key}
            onChange={(event) =>
              updateSetting("key", findKeyOption(event.target.value, settings.key))
            }
          >
            {KEY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label
          className="controls__field tooltip"
          title="Major for brightness, minor for moodiness"
        >
          <span className="controls__label">Mode</span>
          <select
            value={settings.mode}
            onChange={(event) =>
              updateSetting("mode", event.target.value as (typeof MODE_OPTIONS)[number])
            }
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="controls__field tooltip" title="Length of the loop">
          <span className="controls__label">Bars</span>
          <select
            value={settings.bars}
            onChange={(event) =>
              updateSetting("bars", Number.parseInt(event.target.value, 10) as 4 | 8 | 16)
            }
          >
            {BAR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="controls__field tooltip" title="Overall tempo">
          <span className="controls__label">BPM</span>
          <input
            type="range"
            min={70}
            max={130}
            step={1}
            value={settings.bpm}
            onChange={(event) => handleNumberChange(event, "bpm")}
            aria-valuetext={`${settings.bpm} BPM`}
          />
          <span className="controls__value">{settings.bpm}</span>
        </label>
        <label
          className="controls__field tooltip"
          title="Adds laid-back swing to off beats"
        >
          <span className="controls__label">Swing</span>
          <input
            type="range"
            min={0}
            max={0.25}
            step={0.01}
            value={settings.swing}
            onChange={(event) => handleNumberChange(event, "swing")}
            aria-valuetext={`${Math.round(settings.swing * 100)} percent swing`}
          />
          <span className="controls__value">{Math.round(settings.swing * 100)}%</span>
        </label>
        <label className="controls__field tooltip" title="Sets the master output level">
          <span className="controls__label">Master</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.master}
            onChange={(event) => handleNumberChange(event, "master")}
            aria-valuetext={`${Math.round(settings.master * 100)} percent`}
          />
          <span className="controls__value">{Math.round(settings.master * 100)}%</span>
        </label>
      </div>
    </section>
  );
}
