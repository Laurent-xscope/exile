"use client";

import {
  useRef,
  useState,
  useEffect,
  useId,
  type ReactNode,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { cx } from "@/utils/cx";

export interface LetterpressCard3DProps {
  frontContent: ReactNode;
  backContent: ReactNode;
  isFlipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  className?: string;
  minHeightClassName?: string;
  enablePointerSweep?: boolean;
  ariaLabel?: string;
}

export function LetterpressCard3D({
  frontContent,
  backContent,
  isFlipped,
  onFlipChange,
  className,
  minHeightClassName = "min-h-[460px] sm:min-h-[420px]",
  enablePointerSweep = true,
  ariaLabel = "Kartu belajar interaktif 3d",
}: LetterpressCard3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const [internalFlipped, setInternalFlipped] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const flipped = isFlipped !== undefined ? isFlipped : internalFlipped;
  const flippedRef = useRef(flipped);

  const rawId = useId();
  const filterId = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const frontFilterId = `card-fiber-front-${filterId}`;
  const backFilterId = `card-fiber-back-${filterId}`;

  // Spring physics for natural cardstock inertia
  const springConfig = { stiffness: 220, damping: 24, mass: 0.95 };
  const rawRotateY = useMotionValue(flipped ? 180 : 0);
  const rawRotateX = useMotionValue(0);

  const rotateY = useSpring(rawRotateY, springConfig);
  const rotateX = useSpring(rawRotateX, springConfig);

  // Sync external flipped state when pointer leaves
  useEffect(() => {
    flippedRef.current = flipped;
    if (!isPointerInside) {
      rawRotateY.set(flipped ? 180 : 0);
      rawRotateX.set(0);
    }
  }, [flipped, isPointerInside, rawRotateY, rawRotateX]);

  // Dynamic specular sheen tracking rotation angle across linen grain
  const sheenTranslateX = useTransform(
    rotateY,
    [-20, 0, 20, 160, 180, 200],
    ["-30%", "30%", "90%", "-30%", "30%", "90%"]
  );
  const sheenOpacity = useTransform(
    rotateY,
    [-20, 0, 20, 160, 180, 200],
    [0.16, 0.34, 0.48, 0.16, 0.34, 0.48]
  );

  const handlePointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || shouldReduceMotion) return;
    setIsPointerInside(true);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || e.pointerType === "touch" || !enablePointerSweep) return;
    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const xRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yRatio = (e.clientY - rect.top) / rect.height - 0.5;

    // Tilt card smoothly around its current face (+/- 15 degrees)
    const baseFaceY = flippedRef.current ? 180 : 0;
    const tiltY = (xRatio - 0.5) * 30;
    const targetY = baseFaceY + tiltY;
    const targetX = -yRatio * 18;

    rawRotateY.set(targetY);
    rawRotateX.set(targetX);
  };

  const handlePointerLeave = () => {
    setIsPointerInside(false);
    rawRotateX.set(0);
    rawRotateY.set(flippedRef.current ? 180 : 0);
  };

  const toggleFlip = () => {
    const next = !flippedRef.current;
    if (isFlipped === undefined) {
      setInternalFlipped(next);
    }
    onFlipChange?.(next);
    rawRotateY.set(next ? 180 : 0);
    rawRotateX.set(0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleFlip();
    }
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cx(
        "relative w-full cursor-pointer select-none outline-none group rounded-2xl overflow-hidden",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        className
      )}
      style={{ perspective: "1200px" }}
    >
      <motion.div
        style={{
          transformStyle: "preserve-3d",
          rotateY,
          rotateX,
        }}
        className={cx(
          "relative w-full rounded-2xl overflow-hidden will-change-transform",
          minHeightClassName
        )}
      >
        {/* FRONT FACE (translateZ 1.5px) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: "translateZ(1.5px)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            visibility: flipped ? "hidden" : "visible",
            pointerEvents: flipped ? "none" : "auto",
          }}
          className={cx(
            "absolute inset-0 rounded-2xl overflow-hidden [clip-path:inset(0_round_1rem)] [isolation:isolate] vb-letterpress-surface",
            "bg-background-secondary-default border border-border-button-default",
            "p-4 sm:p-6 md:p-8 flex flex-col justify-between text-start",
            "shadow-[0_1px_1px_rgba(0,0,0,0.04),0_2.5px_0_var(--color-background-tertiary-default),0_16px_32px_-6px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.05)]",
            "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-[1px] after:rounded-t-2xl after:bg-background-primary-default/40"
          )}
        >
          {/* Visible woven cotton-and-linen cross-hatch fiber texture */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, rgba(90, 60, 30, 0.4) 0px, rgba(90, 60, 30, 0.4) 1px, transparent 1px, transparent 4px),
                repeating-linear-gradient(90deg, rgba(90, 60, 30, 0.4) 0px, rgba(90, 60, 30, 0.4) 1px, transparent 1px, transparent 4px)
              `,
            }}
          />

          {/* SVG micro-grain texture (Desktop sm+ only to ensure high-performance 60fps on mobile) */}
          <svg
            aria-hidden="true"
            className="hidden sm:block pointer-events-none absolute inset-0 size-full rounded-2xl overflow-hidden opacity-[0.05] mix-blend-overlay"
          >
            <filter id={frontFilterId}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.75"
                numOctaves="3"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" rx="16" ry="16" filter={`url(#${frontFilterId})`} />
          </svg>

          {/* Dynamic diagonal specular light sheen moving across rough linen grain */}
          {!shouldReduceMotion && (
            <motion.div
              aria-hidden="true"
              style={{
                x: sheenTranslateX,
                opacity: sheenOpacity,
              }}
              className="pointer-events-none absolute -inset-y-20 -inset-x-20 w-[140%] rotate-25 bg-gradient-to-r from-transparent via-background-primary-default/30 to-transparent mix-blend-soft-light"
            />
          )}

          <div className="relative z-10 flex flex-col justify-between h-full">
            {frontContent}
          </div>
        </div>

        {/* BACK FACE (rotateY 180deg, translateZ 1.5px) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: "rotateY(180deg) translateZ(1.5px)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            visibility: flipped ? "visible" : "hidden",
            pointerEvents: flipped ? "auto" : "none",
          }}
          className={cx(
            "absolute inset-0 rounded-2xl overflow-hidden [clip-path:inset(0_round_1rem)] [isolation:isolate] vb-letterpress-surface",
            "bg-background-secondary-default border border-border-button-default",
            "p-4 sm:p-6 md:p-8 flex flex-col justify-between text-start",
            "shadow-[0_1px_1px_rgba(0,0,0,0.04),0_2.5px_0_var(--color-background-tertiary-default),0_16px_32px_-6px_rgba(0,0,0,0.1),0_4px_8px_-2px_rgba(0,0,0,0.05)]",
            "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-[1px] after:rounded-t-2xl after:bg-background-primary-default/40"
          )}
        >
          {/* Visible woven cotton-and-linen cross-hatch fiber texture */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage: `
                repeating-linear-gradient(0deg, rgba(90, 60, 30, 0.4) 0px, rgba(90, 60, 30, 0.4) 1px, transparent 1px, transparent 4px),
                repeating-linear-gradient(90deg, rgba(90, 60, 30, 0.4) 0px, rgba(90, 60, 30, 0.4) 1px, transparent 1px, transparent 4px)
              `,
            }}
          />

          {/* SVG micro-grain texture (Desktop sm+ only to ensure high-performance 60fps on mobile) */}
          <svg
            aria-hidden="true"
            className="hidden sm:block pointer-events-none absolute inset-0 size-full rounded-2xl overflow-hidden opacity-[0.05] mix-blend-overlay"
          >
            <filter id={backFilterId}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.75"
                numOctaves="3"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" rx="16" ry="16" filter={`url(#${backFilterId})`} />
          </svg>

          {/* Dynamic diagonal specular light sheen */}
          {!shouldReduceMotion && (
            <motion.div
              aria-hidden="true"
              style={{
                x: sheenTranslateX,
                opacity: sheenOpacity,
              }}
              className="pointer-events-none absolute -inset-y-20 -inset-x-20 w-[140%] rotate-25 bg-gradient-to-r from-transparent via-background-primary-default/30 to-transparent mix-blend-soft-light"
            />
          )}

          <div className="relative z-10 flex flex-col justify-between h-full">
            {backContent}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
