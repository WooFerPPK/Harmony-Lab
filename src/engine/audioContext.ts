let context: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (context) {
    return context;
  }

  if (typeof window === "undefined") {
    throw new Error("AudioContext is not available in this environment");
  }

  const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioCtor) {
    throw new Error("Web Audio API is not supported");
  }

  context = new AudioCtor();
  return context;
}

export async function ensureAudioContext(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

export function resetAudioContextForTests() {
  context = null;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type {};
