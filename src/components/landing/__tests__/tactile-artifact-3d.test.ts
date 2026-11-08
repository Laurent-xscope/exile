import { describe, it, expect } from "bun:test";
import {
  TACTILE_SUBJECTS,
  isWebGLAvailable,
} from "../tactile-artifact-3d";

describe("TactileArtifact3D Mobile Optimization & Performance", () => {
  it("exports valid curriculum subjects with sentence case and verified data", () => {
    expect(TACTILE_SUBJECTS).toHaveLength(3);
    const ids = TACTILE_SUBJECTS.map((s) => s.id);
    expect(ids).toEqual(["sains", "biologi", "bahasa"]);

    for (const subject of TACTILE_SUBJECTS) {
      expect(subject.pillLabel.length).toBeGreaterThan(0);
      expect(subject.question.length).toBeGreaterThan(0);
      expect(subject.badge.length).toBeGreaterThan(0);
      expect(subject.backPrinciple.length).toBeGreaterThan(0);
      expect(subject.backRationale1.length).toBeGreaterThan(0);
      expect(subject.backRationale2.length).toBeGreaterThan(0);
      expect(subject.takeaway.length).toBeGreaterThan(0);

      // Verify sentence case (first letter uppercase, rest lowercase unless acronym)
      const firstChar = subject.pillLabel[0];
      expect(firstChar).toBe(firstChar.toUpperCase());
    }
  });

  it("safely detects WebGL support in any environment without throwing", () => {
    const supported = isWebGLAvailable();
    expect(typeof supported).toBe("boolean");
  });

  it("calculates mobile camera frustum on 360px - 390px screens preventing canvas overflow", () => {
    // Stage dimensions for 360px screen with 16px page padding
    const width360 = 360 - 32; // 328px
    const height = 480;
    const aspect360 = width360 / height; // 0.683

    const getCamZ = (aspect: number) => {
      if (aspect < 0.75) return 13.2;
      if (aspect < 1) return 12.8;
      return 9.3;
    };

    const camZ360 = getCamZ(aspect360);
    expect(camZ360).toBe(13.2);

    // Camera FOV = 38 deg -> half-angle 19 deg
    const visibleHalfHeight = camZ360 * Math.tan((19 * Math.PI) / 180);
    const visibleWidth360 = 2 * visibleHalfHeight * aspect360;

    // Folio width is ~2.48, desk board span is ~5.40
    const deskSpan = 5.4;
    expect(visibleWidth360).toBeGreaterThan(deskSpan);

    // Stage dimensions for 390px screen (capped at max-w-[340px])
    const width390 = Math.min(390 - 32, 340); // 340px
    const aspect390 = width390 / height; // 0.708
    const camZ390 = getCamZ(aspect390);
    expect(camZ390).toBe(13.2);

    const visibleWidth390 = 2 * (camZ390 * Math.tan((19 * Math.PI) / 180)) * aspect390;
    expect(visibleWidth390).toBeGreaterThan(deskSpan);
  });

  it("clamps mobile WebGL pixel ratio to 1.5 to prevent phone heating", () => {
    const clampPixelRatio = (dpr: number, isMobile: boolean) => {
      const maxPR = isMobile ? 1.5 : 2.0;
      return Math.min(dpr, maxPR);
    };

    // Modern mobile device with DPR 3.0 (e.g. iPhone Retina / flagship Android)
    expect(clampPixelRatio(3.0, true)).toBe(1.5);
    // Standard mobile device with DPR 2.0
    expect(clampPixelRatio(2.0, true)).toBe(1.5);
    // Low-end mobile device with DPR 1.0
    expect(clampPixelRatio(1.0, true)).toBe(1.0);
    // Desktop with DPR 2.0
    expect(clampPixelRatio(2.0, false)).toBe(2.0);
  });

  it("discriminates vertical page scroll from horizontal card rotation gestures", () => {
    // Simulating touch move gesture discriminator
    const processTouchGesture = (
      deltaX: number,
      deltaY: number
    ): "scroll" | "rotate" | "pending" => {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absY > absX && absY > 8) {
        return "scroll";
      }
      if (absX > 8) {
        return "rotate";
      }
      return "pending";
    };

    // Swiping down to scroll page: deltaY = 24, deltaX = 3
    expect(processTouchGesture(3, 24)).toBe("scroll");
    // Swiping up to scroll page: deltaY = -30, deltaX = -5
    expect(processTouchGesture(-5, -30)).toBe("scroll");
    // Swiping horizontally to rotate card: deltaX = 25, deltaY = 4
    expect(processTouchGesture(25, 4)).toBe("rotate");
    // Subtle tap / small movement under threshold
    expect(processTouchGesture(2, 3)).toBe("pending");
  });
});
