import { useMemo } from "react";

import { useAppStore } from "@store/useAppStore";

import "./TransportBar.scss";

export function TransportBar() {
  const settings = useAppStore((state) => state.settings);
  const playing = useAppStore((state) => state.playing);
  const start = useAppStore((state) => state.start);
  const stop = useAppStore((state) => state.stop);
  const generate = useAppStore((state) => state.generate);

  const info = useMemo(() => {
    const swingPercent = Math.round(settings.swing * 100);
    const masterPercent = Math.round(settings.master * 100);
    return `${settings.bars} bars • ${settings.bpm} BPM • Swing ${swingPercent}% • Master ${masterPercent}%`;
  }, [settings]);

  const handleStart = () => {
    if (!playing) {
      void start();
    }
  };

  const handleStop = () => {
    if (playing) {
      stop();
    }
  };

  return (
    <header className="transport panel" aria-label="Transport controls">
      <div className="transport__buttons">
        <button
          type="button"
          className="transport__btn transport__btn--primary"
          onClick={generate}
          aria-label="Generate a new harmony"
        >
          Generate
        </button>
        <button
          type="button"
          className="transport__btn"
          onClick={handleStart}
          aria-pressed={playing}
          disabled={playing}
          aria-label="Play loop"
        >
          Play
        </button>
        <button
          type="button"
          className="transport__btn"
          onClick={handleStop}
          disabled={!playing}
          aria-label="Stop loop"
        >
          Stop
        </button>
      </div>
      <div className="transport__indicator" aria-live="polite">
        <span className="transport__tag">
          {settings.key} {settings.mode}
        </span>
        <span className="transport__details">{info}</span>
      </div>
    </header>
  );
}
