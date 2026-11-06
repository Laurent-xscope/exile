import { describe, expect, it } from "bun:test";
import {
  calculateScrollDuration,
  calculateScrollProgress,
  calculateScrollTarget,
  cancelActiveScroll,
  easeOutQuart,
  focusTargetElement,
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
    // Floating point round
    expect(calculateScrollTarget(100.4, 100, 72)).toBe(128);
    expect(calculateScrollTarget(100.8, 100, 72)).toBe(129);
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
    expect(calculateScrollDuration(-10000)).toBe(680);
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

  it("handles modal inspection safely and accurately", () => {
    expect(isInsideModal(null)).toBe(false);

    const normalElement = {
      closest: (sel: string) => (sel.includes("dialog") ? null : null),
    } as unknown as HTMLElement;
    expect(isInsideModal(normalElement)).toBe(false);

    const dialogElement = {
      closest: (sel: string) => (sel.includes('[role="dialog"]') ? {} : null),
    } as unknown as HTMLElement;
    expect(isInsideModal(dialogElement)).toBe(true);

    const overlayElement = {
      closest: (sel: string) => (sel.includes("[data-overlay-container]") ? {} : null),
    } as unknown as HTMLElement;
    expect(isInsideModal(overlayElement)).toBe(true);
  });

  it("handles cancelActiveScroll safely when no animation is active", () => {
    expect(() => cancelActiveScroll()).not.toThrow();
  });

  it("sets tabindex and focuses target element safely", () => {
    let focusCalled = false;
    let setAttrCalled = false;
    const mockEl = {
      hasAttribute: (_attr: string) => false,
      setAttribute: (attr: string, val: string) => {
        if (attr === "tabindex" && val === "-1") setAttrCalled = true;
      },
      focus: (_opts?: FocusOptions) => {
        focusCalled = true;
      },
    } as unknown as HTMLElement;

    focusTargetElement(mockEl);
    expect(setAttrCalled).toBe(true);
    expect(focusCalled).toBe(true);

    // Null safety
    expect(() => focusTargetElement(null)).not.toThrow();
  });
});
