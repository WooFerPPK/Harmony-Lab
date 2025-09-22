import type { ChangeEvent } from "react";

import { useAppStore } from "@store/useAppStore";

import "./Mixer.scss";

export function Mixer() {
  const settings = useAppStore((state) => state.settings);
  const updateSetting = useAppStore((state) => state.updateSetting);

  const handleSlider = (
    event: ChangeEvent<HTMLInputElement>,
    key: "cutoff" | "delayFB" | "drive",
  ) => {
    const value = Number.parseFloat(event.target.value);
    updateSetting(key, Number.isFinite(value) ? value : settings[key]);
  };

  return (
    <section className="mixer panel" aria-label="Mixer settings">
      <h2 className="panel__title">Mixer</h2>
      <div className="mixer__toggles">
        <label className="mixer__toggle">
          <input
            type="checkbox"
            checked={settings.limiter}
            onChange={(event) => updateSetting("limiter", event.target.checked)}
          />
          <span>Limiter</span>
        </label>
        <label className="mixer__toggle">
          <input
            type="checkbox"
            checked={settings.autoGain}
            onChange={(event) => updateSetting("autoGain", event.target.checked)}
          />
          <span>Auto-Gain</span>
        </label>
        <label className="mixer__toggle">
          <input
            type="checkbox"
            checked={settings.nice}
            onChange={(event) => updateSetting("nice", event.target.checked)}
          />
          <span>Nice Mode</span>
        </label>
      </div>
      <div className="mixer__sliders">
        <label className="mixer__field">
          <span className="mixer__label">Filter Cutoff</span>
          <input
            type="range"
            min={400}
            max={6000}
            step={50}
            value={settings.cutoff}
            onChange={(event) => handleSlider(event, "cutoff")}
            aria-valuetext={`${Math.round(settings.cutoff)} Hz`}
          />
          <span className="mixer__value">{Math.round(settings.cutoff)} Hz</span>
        </label>
        <label className="mixer__field">
          <span className="mixer__label">Delay Feedback</span>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.01}
            value={settings.delayFB}
            onChange={(event) => handleSlider(event, "delayFB")}
            aria-valuetext={`${Math.round(settings.delayFB * 100)} percent`}
          />
          <span className="mixer__value">{Math.round(settings.delayFB * 100)}%</span>
        </label>
        <label className="mixer__field">
          <span className="mixer__label">Drive</span>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={settings.drive}
            onChange={(event) => handleSlider(event, "drive")}
            aria-valuetext={`${Math.round(settings.drive * 200)} percent saturation`}
          />
          <span className="mixer__value">{(settings.drive * 100).toFixed(0)}%</span>
        </label>
      </div>
    </section>
  );
}
