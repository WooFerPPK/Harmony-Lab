import { useEffect, useRef } from "react";

import { useAppStore } from "@store/useAppStore";

import "./Visualizer.scss";

export function Visualizer() {
  const visualizer = useAppStore((state) => state.visualizer);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visualizer) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frameId: number;

    const render = () => {
      const { width, height } = canvas;
      const buffer = visualizer.getWaveform();
      context.clearRect(0, 0, width, height);
      context.beginPath();
      const midY = height / 2;
      context.moveTo(0, midY);
      for (let i = 0; i < buffer.length; i += 1) {
        const x = (i / buffer.length) * width;
        const y = midY + buffer[i] * (height / 2);
        context.lineTo(x, y);
      }
      context.strokeStyle = "rgba(159, 170, 255, 0.9)";
      context.lineWidth = 2;
      context.stroke();
      frameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    render();

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [visualizer]);

  return (
    <section className="visualizer panel" aria-label="Oscilloscope">
      <h2 className="panel__title">Visualizer</h2>
      <div className="visualizer__canvas-wrap">
        <canvas ref={canvasRef} className="visualizer__canvas" />
        {!visualizer && (
          <p className="visualizer__placeholder">Start playback to see the waveform.</p>
        )}
      </div>
    </section>
  );
}
