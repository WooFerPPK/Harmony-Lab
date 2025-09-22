import { useEffect, useState } from "react";

import { useAppStore } from "@store/useAppStore";

import "./PresetManager.scss";

export function PresetManager() {
  const presets = useAppStore((state) => state.presets);
  const refreshPresets = useAppStore((state) => state.refreshPresets);
  const savePreset = useAppStore((state) => state.savePreset);
  const loadPreset = useAppStore((state) => state.loadPreset);
  const exportPreset = useAppStore((state) => state.exportPreset);
  const importPreset = useAppStore((state) => state.importPreset);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [importValue, setImportValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    refreshPresets();
  }, [refreshPresets]);

  useEffect(() => {
    if (presets.length > 0 && !selected) {
      setSelected(presets[0].name);
    }
  }, [presets, selected]);

  const handleSave = () => {
    if (!name.trim()) {
      setStatus("Enter a preset name to save.");
      return;
    }
    savePreset(name.trim());
    refreshPresets();
    setSelected(name.trim());
    setStatus(`Saved preset "${name.trim()}"`);
  };

  const handleLoad = () => {
    if (!selected) {
      return;
    }
    const success = loadPreset(selected);
    setStatus(success ? `Loaded preset "${selected}"` : "Preset not found");
  };

  const handleExport = () => {
    if (!selected) {
      return;
    }
    const data = exportPreset(selected);
    if (!data) {
      setStatus("Nothing to export.");
      return;
    }
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported "${selected}"`);
  };

  const handleImport = () => {
    if (!importValue.trim()) {
      setStatus("Paste preset JSON to import.");
      return;
    }
    try {
      importPreset(importValue);
      refreshPresets();
      setStatus("Imported preset successfully.");
      setImportValue("");
    } catch {
      setStatus("Import failed. Check JSON format.");
    }
  };

  return (
    <section className="presets panel" aria-label="Preset manager">
      <h2 className="panel__title">Presets</h2>
      <div className="presets__row">
        <label className="presets__field">
          <span className="presets__label">Preset name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lofi sunrise"
          />
        </label>
        <button
          type="button"
          className="presets__btn presets__btn--primary"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
      <div className="presets__row">
        <label className="presets__field">
          <span className="presets__label">Saved presets</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="presets__btn" onClick={handleLoad}>
          Load
        </button>
        <button type="button" className="presets__btn" onClick={handleExport}>
          Export
        </button>
      </div>
      <div className="presets__import">
        <label className="presets__label" htmlFor="preset-import">
          Import JSON
        </label>
        <textarea
          id="preset-import"
          value={importValue}
          onChange={(event) => setImportValue(event.target.value)}
          placeholder="Paste preset JSON here"
          spellCheck={false}
        />
        <button type="button" className="presets__btn" onClick={handleImport}>
          Import
        </button>
      </div>
      {status && <p className="presets__status">{status}</p>}
    </section>
  );
}
