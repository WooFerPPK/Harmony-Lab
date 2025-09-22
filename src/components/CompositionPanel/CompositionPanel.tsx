import { useMemo, useState } from "react";

import { midiToNoteToken } from "@theory/notes";
import { useAppStore } from "@store/useAppStore";

import "./CompositionPanel.scss";

type PartName = "lead" | "arp" | "bass";
type ErrorMap = Partial<Record<PartName, string[]>>;

type DegreeValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DEGREE_VALUES: DegreeValue[] = [0, 1, 2, 3, 4, 5, 6];
const ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"] as const;

const PART_LABELS: Record<PartName, string> = {
  lead: "Lead (8ths)",
  arp: "Arp (16ths)",
  bass: "Bass (quarters)",
};

const PART_DESCRIPTIONS: Record<PartName, string> = {
  lead: "Melody that dances across the chords.",
  arp: "Arpeggio that fills the harmony.",
  bass: "Foundation that anchors each bar.",
};

const PARTS: PartName[] = ["lead", "arp", "bass"];

export function CompositionPanel() {
  const progression = useAppStore((state) => state.progression);
  const settings = useAppStore((state) => state.settings);
  const updateProgression = useAppStore((state) => state.updateProgression);

  const noteText = useAppStore((state) => state.noteText);
  const setNoteText = useAppStore((state) => state.setNoteText);
  const applyNoteText = useAppStore((state) => state.applyNoteText);
  const clearNotes = useAppStore((state) => state.clearNotes);
  const setLockNotes = useAppStore((state) => state.setLockNotes);

  const nowPlaying = useAppStore((state) => state.nowPlaying);

  const [errors, setErrors] = useState<ErrorMap>({});

  const labels = useMemo(() => {
    return ROMAN_MAJOR.map((symbol) =>
      settings.mode === "minor" ? symbol.toLowerCase() : symbol,
    );
  }, [settings.mode]);

  const handleProgressionChange = (index: number, value: number) => {
    const next = [...progression.degrees];
    next[index] = value as DegreeValue;
    updateProgression(next);
  };

  const handleApply = () => {
    const nextErrors: ErrorMap = {};
    PARTS.forEach((part) => {
      const result = applyNoteText(part);
      if (result.invalidTokens.length > 0) {
        nextErrors[part] = result.invalidTokens;
      }
    });
    setErrors(nextErrors);
  };

  const handleClear = () => {
    clearNotes();
    setErrors({});
  };

  return (
    <section className="composition panel" aria-label="Composition editor">
      <header className="composition__header">
        <h2 className="panel__title">Composition</h2>
        <label className="composition__lock">
          <input
            type="checkbox"
            checked={settings.lockNotes}
            onChange={(event) => setLockNotes(event.target.checked)}
          />
          <span>Keep my custom notes</span>
        </label>
      </header>
      <p className="composition__description">
        Shape the chord changes and edit the parts below. Generating updates the same note
        fields unless you choose to keep your custom notes locked.
      </p>
      <div className="composition__group" aria-label="Chord progression">
        <h3 className="composition__subtitle">Chord progression</h3>
        <div className="composition__progression-grid">
          {Array.from({ length: settings.bars }, (_, index) => {
            const degree = progression.degrees[index % progression.degrees.length] ?? 0;
            return (
              <label key={index} className="composition__progression-cell">
                <span className="composition__label">Bar {index + 1}</span>
                <select
                  value={degree}
                  onChange={(event) =>
                    handleProgressionChange(
                      index,
                      Number.parseInt(event.target.value, 10),
                    )
                  }
                  aria-label={`Chord degree for bar ${index + 1}`}
                >
                  {DEGREE_VALUES.map((option, optionIndex) => (
                    <option key={option} value={option}>
                      {labels[optionIndex]}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      </div>
      <div className="composition__group" aria-label="Instrument parts">
        <h3 className="composition__subtitle">Instrument parts</h3>
        <p className="composition__hint">
          The text areas always show the exact notes that will play. Generate to refresh
          them, tweak them directly, and apply to lock in your changes.
        </p>
        <div className="composition__parts-grid">
          {PARTS.map((part) => {
            const playing = midiToNoteToken(nowPlaying[part]);
            return (
              <div key={part} className="composition__part">
                <div className="composition__part-header">
                  <div className="composition__part-title">
                    <span className="composition__label">{PART_LABELS[part]}</span>
                    <span className="composition__description-text">
                      {PART_DESCRIPTIONS[part]}
                    </span>
                  </div>
                  <span className="composition__now-playing" aria-live="polite">
                    {playing === "---" ? "Rest" : `Now: ${playing}`}
                  </span>
                </div>
                <textarea
                  className="composition__textarea"
                  id={`notes-${part}`}
                  value={noteText[part]}
                  onChange={(event) => setNoteText(part, event.target.value)}
                  spellCheck={false}
                  aria-describedby={
                    errors[part] ? `composition-error-${part}` : undefined
                  }
                />
                {errors[part] && (
                  <p
                    id={`composition-error-${part}`}
                    className="composition__error"
                    aria-live="polite"
                  >
                    Ignored tokens: {errors[part]?.join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="composition__actions">
        <button
          type="button"
          className="composition__btn composition__btn--primary"
          onClick={handleApply}
        >
          Apply Notes
        </button>
        <button type="button" className="composition__btn" onClick={handleClear}>
          Clear Notes
        </button>
      </div>
    </section>
  );
}
