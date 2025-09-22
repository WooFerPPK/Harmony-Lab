# Project agents

Harmony Lab is tended by six specialist "agents". Each one owns a facet of the product so that the flow from theory to build remains crisp.

## Composer Agent

- Curates chord progressions and ensures the generator stitches musical 4/8/16 bar loops.
- Defines the mapping between keys, modes, scales, chords, and note tokens.
- Reviews lead/bass/arp algorithms for tasteful voicings and balanced voice-leading.

## Sound Designer Agent

- Tunes synth voice defaults, envelopes, drive curves, and Nice Mode adjustments.
- Dials in filter, delay, compressor, limiter, and auto-gain settings for smooth playback.
- Shapes the analyser feed so the visualizer reflects the final master bus.

## Frontend Agent

- Builds the React + TypeScript architecture, keeps components modular, and wires Zustand state.
- Owns accessibility (ARIA labels, focus states) and the SCSS BEM styling system.
- Maintains absolute import aliases and shared UI primitives across panels.

## Audio Engine Agent

- Maintains the Web Audio graph, scheduler lookahead logic, and synthesizer triggers.
- Guarantees loop timing, swing behaviour, and resilient AudioContext handling.
- Coordinates with the store to keep events, transport, and visualizer data in sync.

## QA Agent

- Authors Vitest unit coverage for theory, sequencing, and timing math.
- Operates Playwright end-to-end specs to guard core UX flows (Generate, lock notes, presets).
- Tracks performance budgets and regression signals for future enhancements.

## Build Agent

- Configures Vite, ESLint, Prettier, Husky, and lint-staged for smooth developer ergonomics.
- Maintains npm scripts, tsconfig paths, and Playwright config for CI automation.
- Oversees release artifacts, ensuring builds, tests, and lint checks stay green.
