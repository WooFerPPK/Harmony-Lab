import { useMemo } from "react";

import { formatNoteText } from "@theory/notes";
import { useAppStore } from "@store/useAppStore";

import "./GeneratedNotes.scss";

const LABELS: Record<"lead" | "arp" | "bass", string> = {
  lead: "Lead",
  arp: "Arp",
  bass: "Bass",
};
const PARTS = ["lead", "arp", "bass"] as const;

export function GeneratedNotes() {
  const generated = useAppStore((state) => state.generatedNotes);

  const text = useMemo(
    () => ({
      lead: formatNoteText(generated.lead),
      arp: formatNoteText(generated.arp),
      bass: formatNoteText(generated.bass),
    }),
    [generated],
  );

  return (
    <section className="generated panel" aria-label="Generated notes">
      <h2 className="panel__title">Generated Notes</h2>
      <div className="generated__grid">
        {PARTS.map((part) => (
          <div key={part} className="generated__field">
            <span className="generated__label">{LABELS[part]}</span>
            <pre className="generated__text" aria-live="polite">
              {text[part]}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}
