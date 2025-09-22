import { useMemo } from "react";

import { useAppStore } from "@store/useAppStore";

import "./ProgressionEditor.scss";

const DEGREE_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
const ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

export function ProgressionEditor() {
  const progression = useAppStore((state) => state.progression);
  const settings = useAppStore((state) => state.settings);
  const updateProgression = useAppStore((state) => state.updateProgression);

  const labels = useMemo(() => {
    return ROMAN_MAJOR.map((symbol) =>
      settings.mode === "minor" ? symbol.toLowerCase() : symbol,
    );
  }, [settings.mode]);

  const handleChange = (index: number, value: number) => {
    const next = [...progression.degrees];
    next[index] = value as (typeof DEGREE_VALUES)[number];
    updateProgression(next);
  };

  return (
    <section className="progression panel" aria-label="Chord progression editor">
      <h2 className="panel__title">Progression</h2>
      <div className="progression__grid">
        {Array.from({ length: settings.bars }, (_, index) => {
          const degree = progression.degrees[index % progression.degrees.length] ?? 0;
          return (
            <label key={index} className="progression__cell">
              <span className="progression__label">Bar {index + 1}</span>
              <select
                value={degree}
                onChange={(event) =>
                  handleChange(index, Number.parseInt(event.target.value, 10))
                }
                aria-label={`Chord degree for bar ${index + 1}`}
              >
                {DEGREE_VALUES.map((option, optIndex) => (
                  <option key={option} value={option}>
                    {labels[optIndex]}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </section>
  );
}
