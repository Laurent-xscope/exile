import { describe, expect, it } from "bun:test";
import {
  calculateScrollDuration,
  calculateScrollProgress,
  calculateScrollTarget,
  easeOutQuart,
  getEffectiveScrollBehavior,
  isInsideModal,
  isInternalAnchorLink,
} from "../smooth-scroll";

describe("smooth scroll helpers", () => {
  it("calculates destination scroll position with header offset compensation", () => {
    expect(calculateScrollTarget(200, 0, 72)).toBe(128);
    expect(calculateScrollTarget(50, 0, 72)).toBe(0);
    expect(calculateScrollTarget(300, 500, 72)).toBe(728);
    expect(calculateScrollTarget(0, 0, 72)).toBe(0);
    expect(calculateScrollTarget(100, 100, 0)).toBe(200);
  });

  it("calculates scroll progress correctly clamped between 0 and 1", () => {
    expect(calculateScrollProgress(0, 2000, 1000)).toBe(0);
    expect(calculateScrollProgress(500, 2000, 1000)).toBe(0.5);
    expect(calculateScrollProgress(1000, 2000, 1000)).toBe(1);
    expect(calculateScrollProgress(1500, 2000, 1000)).toBe(1);
    expect(calculateScrollProgress(0, 1000, 1000)).toBe(0);
    // When scrollable <= 0
    expect(calculateScrollProgress(50, 500, 500)).toBe(0);
    expect(calculateScrollProgress(50, 400, 500)).toBe(0);
  });

  it("honours prefers-reduced-motion by falling back to auto scroll", () => {
    expect(getEffectiveScrollBehavior("smooth", false)).toBe("smooth");
    expect(getEffectiveScrollBehavior("smooth", true)).toBe("auto");
    expect(getEffectiveScrollBehavior("auto", false)).toBe("auto");
    expect(getEffectiveScrollBehavior("auto", true)).toBe("auto");
  });

  it("calculates quartic ease-out curve smoothly within [0, 1]", () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
    expect(easeOutQuart(-0.5)).toBe(0);
    expect(easeOutQuart(1.5)).toBe(1);

    // Monotonic and smooth
    const p25 = easeOutQuart(0.25);
    const p50 = easeOutQuart(0.5);
    const p75 = easeOutQuart(0.75);

    expect(p25).toBeGreaterThan(0);
    expect(p50).toBeGreaterThan(p25);
    expect(p75).toBeGreaterThan(p50);
    expect(p75).toBeLessThan(1);
  });

  it("computes bounded scroll duration proportional to distance", () => {
    expect(calculateScrollDuration(0)).toBe(0);
    expect(calculateScrollDuration(100)).toBeGreaterThanOrEqual(320);
    expect(calculateScrollDuration(100)).toBeLessThanOrEqual(680);
    expect(calculateScrollDuration(5000)).toBe(680);
    expect(calculateScrollDuration(-800)).toBeGreaterThanOrEqual(320);
  });

  it("identifies internal anchor links correctly", () => {
    expect(isInternalAnchorLink("#uji-cepat")).toBe(true);
    expect(isInternalAnchorLink("#demo-remotion")).toBe(true);
    expect(isInternalAnchorLink("#tentang")).toBe(true);
    expect(isInternalAnchorLink("/#uji-cepat", "/")).toBe(true);
    expect(isInternalAnchorLink("/#tentang", "/")).toBe(true);
    expect(isInternalAnchorLink("/#tentang", "/studio")).toBe(false);

    expect(isInternalAnchorLink("")).toBe(false);
    expect(isInternalAnchorLink("#")).toBe(false);
    expect(isInternalAnchorLink("/studio")).toBe(false);
    expect(isInternalAnchorLink("https://example.com/#anchor")).toBe(false);
  });

  it("handles modal inspection safely", () => {
    expect(isInsideModal(null)).toBe(false);
  });
});
