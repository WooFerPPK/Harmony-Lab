import { ControlsPanel } from "@components/ControlsPanel/ControlsPanel";
import { GeneratedNotes } from "@components/GeneratedNotes/GeneratedNotes";
import { Mixer } from "@components/Mixer/Mixer";
import { NotesEditor } from "@components/NotesEditor/NotesEditor";
import { PresetManager } from "@components/PresetManager/PresetManager";
import { ProgressionEditor } from "@components/ProgressionEditor/ProgressionEditor";
import { TransportBar } from "@components/TransportBar/TransportBar";
import { Visualizer } from "@components/Visualizer/Visualizer";

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
          <ProgressionEditor />
          <NotesEditor />
          <GeneratedNotes />
        </section>
        <section className="app__column app__column--visual">
          <Visualizer />
        </section>
      </main>
    </div>
  );
}
