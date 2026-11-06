"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cx } from "@/utils/cx";

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
    () => false
  );
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.12, rootMargin = "0px 0px -40px 0px", once = true } = options;
  const elementRef = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;

    const node = elementRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(entry.target);
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once, prefersReduced]);

  return { ref: elementRef, isVisible: isVisible || prefersReduced };
}

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  variant?: "slide-up" | "scale-up" | "fade";
  delay?: number;
  duration?: number;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function ScrollReveal({
  children,
  as: Component = "div",
  variant = "slide-up",
  delay,
  duration,
  threshold = 0.1,
  rootMargin = "0px 0px -40px 0px",
  once = true,
  className,
  style,
  ...props
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({
    threshold,
    rootMargin,
    once,
  });

  const variantClass =
    variant === "scale-up"
      ? "scroll-reveal-scale"
      : variant === "fade"
      ? "scroll-reveal-fade"
      : "scroll-reveal";

  const scrollDrivenClass =
    variant === "scale-up"
      ? "scroll-driven-scale"
      : variant === "fade"
      ? "scroll-driven-fade"
      : "scroll-driven-reveal";

  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(delay ? { transitionDelay: `${delay}ms` } : {}),
    ...(duration ? { "--reveal-duration": `${duration}ms` } as React.CSSProperties : {}),
  };

  return (
    <Component
      ref={ref}
      className={cx(
        variantClass,
        scrollDrivenClass,
        isVisible && "is-visible",
        className
      )}
      style={dynamicStyle}
      {...props}
    >
      {children}
    </Component>
  );
}
