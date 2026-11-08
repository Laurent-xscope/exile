import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type ExileSettings,
} from "../user-settings";

describe("ExileSettings font size settings", () => {
  const storageMap = new Map<string, string>();
  const attributes = new Map<string, string>();

  const localStorageMock = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, String(val)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const documentMock = {
    documentElement: {
      lang: "id",
      setAttribute: (key: string, val: string) => attributes.set(key, val),
      getAttribute: (key: string) => attributes.get(key) ?? null,
      removeAttribute: (key: string) => attributes.delete(key),
      classList: {
        toggle: () => {},
      },
    },
  };

  beforeEach(() => {
    storageMap.clear();
    attributes.clear();
    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { localStorage: unknown }).localStorage = localStorageMock;
    (globalThis as unknown as { document: unknown }).document = documentMock;
  });

  afterEach(() => {
    storageMap.clear();
    attributes.clear();
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    delete (globalThis as unknown as { document?: unknown }).document;
  });

  it("defaults fontSize to 'medium'", () => {
    expect(DEFAULT_SETTINGS.fontSize).toBe("medium");
    const loaded = loadSettings();
    expect(loaded.fontSize).toBe("medium");
  });

  it("saves and applies 'small' font size to documentElement attribute", () => {
    const newSettings: ExileSettings = {
      ...DEFAULT_SETTINGS,
      fontSize: "small",
    };
    saveSettings(newSettings);
    expect(attributes.get("data-font-size")).toBe("small");
    const reloaded = loadSettings();
    expect(reloaded.fontSize).toBe("small");
  });

  it("saves and applies 'large' font size to documentElement attribute", () => {
    const newSettings: ExileSettings = {
      ...DEFAULT_SETTINGS,
      fontSize: "large",
    };
    saveSettings(newSettings);
    expect(attributes.get("data-font-size")).toBe("large");
    const reloaded = loadSettings();
    expect(reloaded.fontSize).toBe("large");
  });

  it("falls back to 'medium' when raw settings in localStorage lacks fontSize", () => {
    localStorageMock.setItem(
      "exile_user_settings",
      JSON.stringify({ language: "id", soundVolume: 50 })
    );
    const loaded = loadSettings();
    expect(loaded.fontSize).toBe("medium");
  });
});
