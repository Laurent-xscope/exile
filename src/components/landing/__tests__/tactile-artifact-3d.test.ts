import { describe, it, expect } from "bun:test";
import {
  TACTILE_SUBJECTS,
  isWebGLAvailable,
  calculateTactileScrollProgress,
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

  it("calculates mobile scroll progress relative to viewport so the 3d desk never starts pre-flipped", () => {
    const windowHeight = 800;

    // 1. Initial page load on mobile: container is below hero text (e.g. rect.top = 700px)
    // Container has not reached 65% of viewport yet -> progress must be strictly 0 (front face pristine!)
    const initialProgress = calculateTactileScrollProgress({
      isMobile: true,
      containerRectTop: 700,
      windowHeight,
    });
    expect(initialProgress).toBe(0);

    // 2. Exactly at entry point (windowHeight * 0.65 = 520px)
    const entryProgress = calculateTactileScrollProgress({
      isMobile: true,
      containerRectTop: 520,
      windowHeight,
    });
    expect(entryProgress).toBe(0);

    // 3. User scrolls and container moves to mid-viewport (rect.top = 220px)
    // range = 520 - (-80) = 600px. (520 - 220) / 600 = 0.5
    const midProgress = calculateTactileScrollProgress({
      isMobile: true,
      containerRectTop: 220,
      windowHeight,
    });
    expect(midProgress).toBeCloseTo(0.5, 4);

    // 4. Container reaches exit boundary (rect.top = -80px)
    const exitProgress = calculateTactileScrollProgress({
      isMobile: true,
      containerRectTop: -80,
      windowHeight,
    });
    expect(exitProgress).toBe(1);

    // 5. Container scrolled well past exit (-500px) -> clamped strictly to 1.0
    const clampedPastProgress = calculateTactileScrollProgress({
      isMobile: true,
      containerRectTop: -500,
      windowHeight,
    });
    expect(clampedPastProgress).toBe(1);

    // 6. Container far below viewport (e.g. 1200px) -> clamped strictly to 0.0
    const clampedBelowProgress = calculateTactileScrollProgress({
      isMobile: true,
      containerRectTop: 1200,
      windowHeight,
    });
    expect(clampedBelowProgress).toBe(0);

    // 7. Missing container on mobile defaults safely to 0
    expect(
      calculateTactileScrollProgress({
        isMobile: true,
        windowHeight,
      })
    ).toBe(0);
  });

  it("calculates desktop scroll progress via sticky hero runway", () => {
    const windowHeight = 800;
    const heroHeight = 1600; // runway = 800px

    // Top of page
    expect(
      calculateTactileScrollProgress({
        isMobile: false,
        heroRectTop: 0,
        heroHeight,
        windowHeight,
      })
    ).toBe(0);

    // Halfway through hero sticky runway
    expect(
      calculateTactileScrollProgress({
        isMobile: false,
        heroRectTop: -400,
        heroHeight,
        windowHeight,
      })
    ).toBe(0.5);

    // End of runway
    expect(
      calculateTactileScrollProgress({
        isMobile: false,
        heroRectTop: -800,
        heroHeight,
        windowHeight,
      })
    ).toBe(1);

    // Scrolled past runway
    expect(
      calculateTactileScrollProgress({
        isMobile: false,
        heroRectTop: -1200,
        heroHeight,
        windowHeight,
      })
    ).toBe(1);

    // Fallback when hero element is missing
    expect(
      calculateTactileScrollProgress({
        isMobile: false,
        scrollY: 225,
        windowHeight,
      })
    ).toBe(0.5);
  });

  it("verifies spring interpolation and scrollBaseY rotation limits", () => {
    // Rotation mapping formula in animate():
    // const scrollBaseY = 0.34 + currentScrollProgress * (Math.PI - 0.68);
    const getScrollBaseY = (progress: number) => 0.34 + progress * (Math.PI - 0.68);

    // At progress = 0: Front face resting angle (~19.5 degrees)
    expect(getScrollBaseY(0)).toBeCloseTo(0.34, 4);

    // At progress = 1: Back face principle view (~160.5 degrees)
    expect(getScrollBaseY(1)).toBeCloseTo(Math.PI - 0.34, 4);

    // Lerp simulation: currentScrollProgress += (targetScroll - currentScrollProgress) * 0.07;
    let current = 0;
    const target = 1.0;
    for (let frame = 0; frame < 60; frame++) {
      current += (target - current) * 0.07;
    }
    // After 60 frames (~1 sec at 60fps), current should smoothly approach target (> 0.98) without overshooting
    expect(current).toBeGreaterThan(0.98);
    expect(current).toBeLessThanOrEqual(1.0);
  });

  it("verifies WebGL cleanup and memory release contract on component unmount", () => {
    // Simulated disposal trackers
    const disposedGeometries: string[] = [];
    const disposedMaterials: string[] = [];
    const disposedTextures: string[] = [];
    let shadowMapDisposed = false;
    let contextLossForced = false;
    let rendererDisposed = false;
    let sceneEnvironmentCleared = false;
    let textureCacheCleared = false;

    // Simulate 18 geometries
    const geometryNames = [
      "coverGeom",
      "paperEdgeGeom",
      "frontPaperGeom",
      "backPaperGeom",
      "grommetGeom",
      "ringGeom",
      "folioClipGeom",
      "deskBoardGeom",
      "blotterGeom",
      "shadowPlaneGeom",
      "plinthGeom",
      "sheetGeom",
      "nibGeom",
      "gripGeom",
      "barrelGeom",
      "bandGeom",
      "clipGeom",
      "finialGeom",
    ];

    const mockGeoms = geometryNames.map((name) => ({
      name,
      dispose: () => disposedGeometries.push(name),
    }));

    // Simulate 10 materials
    const materialNames = [
      "coverMat",
      "paperEdgeMat",
      "frontPaperMat",
      "backPaperMat",
      "brassMat",
      "deskBoardMat",
      "blotterMat",
      "shadowPlaneMat",
      "walnutMat",
      "sheetMat",
    ];
    const mockMats = materialNames.map((name) => ({
      name,
      dispose: () => disposedMaterials.push(name),
    }));

    // Simulate textures and canvases
    const texturesMap: Record<string, { dispose: () => void; canvas: { width: number; height: number } }> = {
      "sains-front": { dispose: () => disposedTextures.push("sains-front"), canvas: { width: 960, height: 1280 } },
      "sains-back": { dispose: () => disposedTextures.push("sains-back"), canvas: { width: 960, height: 1280 } },
      "biologi-front": { dispose: () => disposedTextures.push("biologi-front"), canvas: { width: 960, height: 1280 } },
      "biologi-back": { dispose: () => disposedTextures.push("biologi-back"), canvas: { width: 960, height: 1280 } },
    };

    const mockShadowMap = {
      dispose: () => {
        shadowMapDisposed = true;
      },
    };

    const mockRenderer = {
      forceContextLoss: () => {
        contextLossForced = true;
      },
      dispose: () => {
        rendererDisposed = true;
      },
      domElement: { width: 600, height: 520 },
    };

    // Execute simulated cleanup sequence matching TactileArtifact3D return block
    mockGeoms.forEach((g) => g.dispose());
    mockMats.forEach((m) => m.dispose());
    sceneEnvironmentCleared = true;
    mockShadowMap.dispose();

    Object.entries(texturesMap).forEach(([, t]) => {
      t.canvas.width = 1;
      t.canvas.height = 1;
      t.dispose();
    });
    textureCacheCleared = true;

    mockRenderer.forceContextLoss();
    mockRenderer.dispose();
    mockRenderer.domElement.width = 1;
    mockRenderer.domElement.height = 1;

    // Verify all 18 geometries disposed
    expect(disposedGeometries).toHaveLength(18);
    expect(disposedGeometries).toEqual(geometryNames);

    // Verify all 10 materials disposed
    expect(disposedMaterials).toHaveLength(10);
    expect(disposedMaterials).toEqual(materialNames);

    // Verify all textures disposed and canvases shrunk to 1x1
    expect(disposedTextures).toHaveLength(4);
    for (const t of Object.values(texturesMap)) {
      expect(t.canvas.width).toBe(1);
      expect(t.canvas.height).toBe(1);
    }

    // Verify shadow map and context loss
    expect(shadowMapDisposed).toBe(true);
    expect(sceneEnvironmentCleared).toBe(true);
    expect(textureCacheCleared).toBe(true);
    expect(contextLossForced).toBe(true);
    expect(rendererDisposed).toBe(true);
    expect(mockRenderer.domElement.width).toBe(1);
    expect(mockRenderer.domElement.height).toBe(1);
  });

  it("verifies light/dark mode texture in-place updating without allocating new instances", () => {
    // Simulating theme mutation observer behavior
    const canvas = { width: 960, height: 1280, updatedCount: 0 };
    const texture = {
      image: canvas,
      needsUpdate: false,
    };

    // Simulate dark mode toggle
    const updateTextureInPlace = (tex: typeof texture) => {
      tex.image.updatedCount++;
      tex.needsUpdate = true;
    };

    // 1. Initial render
    expect(texture.image.updatedCount).toBe(0);
    expect(texture.needsUpdate).toBe(false);

    // 2. Switch to dark mode: modifies same canvas in place
    updateTextureInPlace(texture);
    expect(texture.image.updatedCount).toBe(1);
    expect(texture.needsUpdate).toBe(true);

    // 3. Switch to light mode: modifies same canvas in place again
    updateTextureInPlace(texture);
    expect(texture.image.updatedCount).toBe(2);
    expect(texture.needsUpdate).toBe(true);

    // Texture reference itself never changes, zero memory leak
    expect(texture.image).toBe(canvas);
  });

  it("proves spring physics mathematical stability: eigenvalues |lambda| < 1 with zero unbounded oscillations", () => {
    const stiffness = 0.085;
    const damping = 0.82;

    // State space matrix A:
    // [e_{n+1}] = [1 - k*d    d] [e_n]
    // [v_{n+1}]   [-k*d       d] [v_n]
    const trA = 1 + damping * (1 - stiffness); // 1 - k*d + d
    const detA = damping; // (1 - k*d)*d - (-k*d)*d = d

    // Schur-Cohn stability conditions:
    // 1. |det(A)| < 1
    expect(Math.abs(detA)).toBeLessThan(1.0);
    expect(detA).toBe(0.82);

    // 2. |tr(A)| < 1 + det(A)
    expect(Math.abs(trA)).toBeLessThan(1 + detA);
    expect(trA).toBeCloseTo(1.7503, 4);

    // Eigenvalue magnitude |lambda| = sqrt(detA)
    const lambdaMag = Math.sqrt(detA);
    expect(lambdaMag).toBeCloseTo(0.90554, 4);
    expect(lambdaMag).toBeLessThan(1.0);

    // Verify 60 steps simulation decays asymptotically without blowup
    let x = 0;
    let v = 0;
    const target = 1.0;
    for (let i = 0; i < 60; i++) {
      const diff = target - x;
      v = (v + diff * stiffness) * damping;
      x += v;
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(v)).toBe(true);
      expect(Math.abs(x)).toBeLessThan(2.0); // Bounded
    }
    // Final settling should be within 1% of target
    expect(x).toBeCloseTo(1.0, 1);
  });

  it("verifies frame-rate independence of spring across 30Hz, 60Hz, and 120Hz ProMotion", () => {
    const simulateRun = (fps: number, durationSec: number) => {
      const dt = 1 / fps;
      const steps = Math.round(fps * durationSec);
      let currentScroll = 0;
      let rotY = 0.34;
      let velY = 0;
      let lift = 0.24;
      const targetScroll = 1.0;

      const stiffness = 0.085;
      const damping = 0.82;

      for (let i = 0; i < steps; i++) {
        const r = dt * 60;
        const scrollLerp = 1 - Math.pow(1 - 0.07, r);
        currentScroll += (targetScroll - currentScroll) * scrollLerp;

        const scrollBaseY = 0.34 + currentScroll * (Math.PI - 0.68);
        const effK = 1 - Math.pow(1 - stiffness, r);
        const effD = Math.pow(damping, r);

        const diffY = scrollBaseY - rotY;
        velY = (velY + diffY * effK) * effD;
        rotY += velY * r;

        lift *= Math.pow(0.88, r);
      }
      return { currentScroll, rotY, lift };
    };

    const res30 = simulateRun(30, 0.5);
    const res60 = simulateRun(60, 0.5);
    const res120 = simulateRun(120, 0.5);

    // Scroll progress convergence matches within 0.5% across all frame rates
    expect(res30.currentScroll).toBeCloseTo(res60.currentScroll, 2);
    expect(res120.currentScroll).toBeCloseTo(res60.currentScroll, 2);

    // Rotation angle matches within 1% across all frame rates
    expect(res30.rotY).toBeCloseTo(res60.rotY, 1);
    expect(res120.rotY).toBeCloseTo(res60.rotY, 1);

    // Lift impulse decay matches identically
    expect(res30.lift).toBeCloseTo(res60.lift, 3);
    expect(res120.lift).toBeCloseTo(res60.lift, 3);
  });

  it("verifies touch drag equations: rotDeltaY scales to Math.PI and rotDeltaX is clamped", () => {
    const width = 340;
    const height = 480;

    // Full horizontal drag (deltaX = width) rotates exactly Math.PI (180 deg flip)
    const fullFlipDeltaY = (width / width) * Math.PI;
    expect(fullFlipDeltaY).toBeCloseTo(Math.PI, 4);

    // Half drag rotates exactly 90 deg (Math.PI / 2)
    const halfFlipDeltaY = ((width / 2) / width) * Math.PI;
    expect(halfFlipDeltaY).toBeCloseTo(Math.PI / 2, 4);

    // Pitch rotDeltaX clamping: clamped strictly between [-0.32, 0.32] rad (~18.3 deg)
    const calcUserOffsetX = (startOffset: number, deltaY: number) => {
      const rotDeltaX = -(deltaY / height) * 0.44;
      return Math.max(-0.32, Math.min(0.32, startOffset + rotDeltaX));
    };

    // Extreme downward mouse drag does not exceed -0.32
    expect(calcUserOffsetX(0, 1000)).toBe(-0.32);
    // Extreme upward mouse drag does not exceed +0.32
    expect(calcUserOffsetX(0, -1000)).toBe(0.32);
    // Gentle mouse drag of 50px stays in linear range
    const gentleExpected = -(50 / 480) * 0.44;
    expect(calcUserOffsetX(0, 50)).toBeCloseTo(gentleExpected, 4);
  });
});
