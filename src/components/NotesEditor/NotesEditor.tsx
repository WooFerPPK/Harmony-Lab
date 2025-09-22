import { useState } from "react";

import { useAppStore } from "@store/useAppStore";

import "./NotesEditor.scss";

type ErrorMap = Partial<Record<"lead" | "arp" | "bass", string[]>>;

const PART_LABELS: Record<"lead" | "arp" | "bass", string> = {
  lead: "Lead (8ths)",
  arp: "Arp (16ths)",
  bass: "Bass (quarters)",
};
const PARTS = ["lead", "arp", "bass"] as const;

export function NotesEditor() {
  const noteText = useAppStore((state) => state.noteText);
  const setNoteText = useAppStore((state) => state.setNoteText);
  const applyNoteText = useAppStore((state) => state.applyNoteText);
  const clearNotes = useAppStore((state) => state.clearNotes);
  const settings = useAppStore((state) => state.settings);
  const setLockNotes = useAppStore((state) => state.setLockNotes);
  const [errors, setErrors] = useState<ErrorMap>({});

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

  return (
    <section className="notes panel" aria-label="Notes editor">
      <div className="notes__header">
        <h2 className="panel__title">Notes</h2>
        <label className="notes__lock">
          <input
            type="checkbox"
            checked={settings.lockNotes}
            onChange={(event) => setLockNotes(event.target.checked)}
          />
          <span>Lock my notes</span>
        </label>
      </div>
      <div className="notes__grid">
        {PARTS.map((part) => (
          <div key={part} className="notes__field">
            <label className="notes__label" htmlFor={`notes-${part}`}>
              {PART_LABELS[part]}
            </label>
            <textarea
              id={`notes-${part}`}
              className="notes__textarea"
              value={noteText[part]}
              onChange={(event) => setNoteText(part, event.target.value)}
              spellCheck={false}
              aria-describedby={errors[part] ? `notes-error-${part}` : undefined}
            />
            {errors[part] && (
              <p id={`notes-error-${part}`} className="notes__error">
                Ignored tokens: {errors[part]?.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="notes__actions">
        <button
          type="button"
          className="notes__btn notes__btn--primary"
          onClick={handleApply}
        >
          Apply Notes
        </button>
        <button type="button" className="notes__btn" onClick={clearNotes}>
          Clear Notes
        </button>
      </div>
    </section>
  );
}
