import { ControlsPanel } from "@components/ControlsPanel/ControlsPanel";
import { Mixer } from "@components/Mixer/Mixer";
import { PresetManager } from "@components/PresetManager/PresetManager";
import { TransportBar } from "@components/TransportBar/TransportBar";
import { Visualizer } from "@components/Visualizer/Visualizer";
import { CompositionPanel } from "@components/CompositionPanel/CompositionPanel";

import "@styles/globals.scss";

export function App() {
  return (
    <div className="app">
      <TransportBar />
      <main className="app__layout" aria-label="Harmony Lab workspace">
        <section className="app__column">
          <ControlsPanel />
          <Mixer />
          <PresetManager />
        </section>
        <section className="app__column">
          <CompositionPanel />
        </section>
        <section className="app__column app__column--visual">
          <Visualizer />
        </section>
      </main>
    </div>
  );
}
