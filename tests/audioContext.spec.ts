import { afterEach, describe, expect, it, vi } from "vitest";

describe("audio context helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates and caches an audio context", async () => {
    vi.resetModules();
    class FakeAudioContext {
      state: AudioContextState = "running";
      resume = vi.fn();
    }
    const fakeWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { AudioContext: FakeAudioContext },
      configurable: true,
    });

    const module = await import("@engine/audioContext");
    module.resetAudioContextForTests();
    const ctx1 = module.getAudioContext();
    const ctx2 = module.getAudioContext();
    expect(ctx1).toBeInstanceOf(FakeAudioContext);
    expect(ctx1).toBe(ctx2);

    Object.defineProperty(globalThis, "window", {
      value: fakeWindow,
      configurable: true,
    });
  });

  it("resumes a suspended context when ensuring availability", async () => {
    vi.resetModules();
    const resume = vi.fn();
    class FakeAudioContext {
      state: AudioContextState = "suspended";
      resume = resume;
    }
    const fakeWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: { AudioContext: FakeAudioContext },
      configurable: true,
    });

    const module = await import("@engine/audioContext");
    module.resetAudioContextForTests();
    const context = await module.ensureAudioContext();
    expect(resume).toHaveBeenCalled();
    expect(context).toBeInstanceOf(FakeAudioContext);

    Object.defineProperty(globalThis, "window", {
      value: fakeWindow,
      configurable: true,
    });
  });

  it("throws when no window context is available", async () => {
    vi.resetModules();
    const globals = globalThis as Record<string, unknown>;
    const originalWindow = globals.window;
    Reflect.deleteProperty(globals, "window");

    const module = await import("@engine/audioContext");
    module.resetAudioContextForTests();
    expect(() => module.getAudioContext()).toThrow();

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });
});
