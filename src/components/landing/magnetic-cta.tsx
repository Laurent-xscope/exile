"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cx } from "@/utils/cx";

export interface MagneticCtaProps {
  children: ReactNode;
  className?: string;
  maxOffset?: number;
  disabled?: boolean;
}

export function MagneticCta({
  children,
  className,
  maxOffset = 4,
  disabled = false,
}: MagneticCtaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 350, damping: 25, mass: 0.5 };
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || shouldReduceMotion || e.pointerType === "touch") return;
    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * 0.15;
    const deltaY = (e.clientY - centerY) * 0.15;

    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, deltaY));

    rawX.set(clampedX);
    rawY.set(clampedY);
  };

  const handlePointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  if (shouldReduceMotion) {
    return <div className={cx("inline-flex", className)}>{children}</div>;
  }

  return (
    <motion.div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ x, y }}
      className={cx("inline-flex will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}
