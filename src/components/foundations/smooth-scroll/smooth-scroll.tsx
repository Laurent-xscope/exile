"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { RiArrowUpLine } from "@remixicon/react";
import { cx } from "@/utils/cx";

export interface SmoothScrollOptions {
  offset?: number;
  behavior?: "smooth" | "auto";
}

export interface SmoothScrollContextValue {
  scrollToTarget: (target: string | HTMLElement, options?: SmoothScrollOptions) => void;
  scrollToTop: (options?: SmoothScrollOptions) => void;
  prefersReduced: boolean;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(null);

export function subscribePrefersReducedMotion(notify: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
}

export function getPrefersReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    () => false
  );
}

/**
 * Calculates the destination scroll position compensating for fixed/sticky masthead headers.
 */
export function calculateScrollTarget(
  targetTop: number,
  currentScrollY: number,
  offset = 72
): number {
  return Math.max(0, targetTop + currentScrollY - offset);
}

/**
 * Calculates scroll progress clamped between 0 and 1.
 */
export function calculateScrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const scrollable = scrollHeight - clientHeight;
  if (scrollable <= 0) return 0;
  return Math.min(1, Math.max(0, scrollTop / scrollable));
}

/**
 * Resolves effective scroll behavior respecting prefers-reduced-motion.
 */
export function getEffectiveScrollBehavior(
  requested: "smooth" | "auto" = "smooth",
  prefersReduced = false
): ScrollBehavior {
  if (prefersReduced) return "auto";
  return requested;
}

/**
 * Quartic ease-out curve for buttery deceleration.
 */
export function easeOutQuart(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - clamped, 4);
}

/**
 * Computes an optimal scroll duration proportional to distance (bounded between 320ms and 680ms).
 */
export function calculateScrollDuration(distance: number): number {
  const abs = Math.abs(distance);
  if (abs === 0) return 0;
  return Math.min(680, Math.max(320, Math.round(Math.sqrt(abs) * 15)));
}

/**
 * Checks if an element is inside an active modal, dialog, or focus-trapped overlay.
 */
export function isInsideModal(element: HTMLElement | null): boolean {
  if (!element) return false;
  return Boolean(
    element.closest('[role="dialog"]') ||
    element.closest('[aria-modal="true"]') ||
    element.closest("[data-overlay-container]") ||
    (typeof document !== "undefined" &&
      document.body.hasAttribute("data-react-aria-modal-open"))
  );
}

/**
 * Determines whether an href is an internal anchor targeting an element on the current page.
 */
export function isInternalAnchorLink(href: string, currentPathname = "/"): boolean {
  if (!href) return false;
  if (href.startsWith("#") && href.length > 1) return true;
  if (href.startsWith("/#") && (currentPathname === "/" || currentPathname === "")) return true;

  if (typeof window !== "undefined") {
    try {
      const url = new URL(href, window.location.origin);
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.hash.length > 1
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Performs a lightweight, buttery smooth animated scroll using requestAnimationFrame.
 * Has near-zero JS overhead (only active during scroll duration) and zero GPU layer overhead.
 * Instantly cancels if user touches, wheels, or presses a navigation key.
 */
export function animateScroll(
  destinationY: number,
  duration: number,
  onComplete?: () => void
): () => void {
  if (typeof window === "undefined") {
    onComplete?.();
    return () => {};
  }

  const startY = window.scrollY || document.documentElement.scrollTop;
  const distance = destinationY - startY;

  if (Math.abs(distance) < 2 || duration <= 0) {
    window.scrollTo(0, destinationY);
    onComplete?.();
    return () => {};
  }

  const html = document.documentElement;
  const prevScrollBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";

  let rafId: number | null = null;
  let isCancelled = false;
  const startTime = performance.now();

  const cleanupListeners = () => {
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", handleKey);
  };

  const cancel = () => {
    if (isCancelled) return;
    isCancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    cleanupListeners();
    html.style.scrollBehavior = prevScrollBehavior;
  };

  const handleKey = (e: KeyboardEvent) => {
    if (
      e.code === "ArrowUp" ||
      e.code === "ArrowDown" ||
      e.code === "PageUp" ||
      e.code === "PageDown" ||
      e.code === "Space" ||
      e.code === "Home" ||
      e.code === "End"
    ) {
      cancel();
    }
  };

  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", handleKey, { passive: true });

  const step = (currentTime: number) => {
    if (isCancelled) return;

    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easedProgress = easeOutQuart(progress);
    const nextY = Math.round(startY + distance * easedProgress);

    window.scrollTo(0, nextY);

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      cleanupListeners();
      html.style.scrollBehavior = prevScrollBehavior;
      onComplete?.();
    }
  };

  rafId = requestAnimationFrame(step);
  return cancel;
}

/**
 * Hook providing smooth scroll operations with accessibility and header offset support.
 */
export function useSmoothScroll() {
  const context = useContext(SmoothScrollContext);
  const localPrefersReduced = usePrefersReducedMotion();

  const prefersReduced = context ? context.prefersReduced : localPrefersReduced;

  const scrollToTarget = useCallback(
    (target: string | HTMLElement, options: SmoothScrollOptions = {}) => {
      if (typeof window === "undefined") return;

      const { offset = 72, behavior = "smooth" } = options;
      const element =
        typeof target === "string"
          ? document.getElementById(target.replace(/^#/, ""))
          : target;

      if (!element) return;

      const rect = element.getBoundingClientRect();
      const destination = calculateScrollTarget(rect.top, window.scrollY, offset);
      const effectiveBehavior = getEffectiveScrollBehavior(behavior, prefersReduced);

      const focusTarget = () => {
        if (!element.hasAttribute("tabindex")) {
          element.setAttribute("tabindex", "-1");
        }
        try {
          element.focus({ preventScroll: true });
        } catch {}
      };

      if (effectiveBehavior === "auto") {
        window.scrollTo({
          top: destination,
          behavior: "auto",
        });
        focusTarget();
        return;
      }

      const distance = destination - window.scrollY;
      const duration = calculateScrollDuration(distance);

      animateScroll(destination, duration, () => {
        focusTarget();
      });
    },
    [prefersReduced]
  );

  const scrollToTop = useCallback(
    (options: SmoothScrollOptions = {}) => {
      if (typeof window === "undefined") return;
      const { behavior = "smooth" } = options;
      const effectiveBehavior = getEffectiveScrollBehavior(behavior, prefersReduced);

      if (effectiveBehavior === "auto") {
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
        return;
      }

      const duration = calculateScrollDuration(window.scrollY);
      animateScroll(0, duration);
    },
    [prefersReduced]
  );

  if (context) {
    return context;
  }

  return { scrollToTarget, scrollToTop, prefersReduced };
}

export interface SmoothScrollProviderProps {
  children: ReactNode;
  headerOffset?: number;
}

/**
 * Dedicated lightweight client provider for smooth scroll animations.
 * Provides global anchor delegation, URL hash synchronization, and React Aria focus preservation.
 */
export function SmoothScrollProvider({
  children,
  headerOffset = 72,
}: SmoothScrollProviderProps) {
  const prefersReduced = usePrefersReducedMotion();

  const scrollToTarget = useCallback(
    (target: string | HTMLElement, options: SmoothScrollOptions = {}) => {
      if (typeof window === "undefined") return;

      const { offset = headerOffset, behavior = "smooth" } = options;
      const element =
        typeof target === "string"
          ? document.getElementById(target.replace(/^#/, ""))
          : target;

      if (!element) return;

      const rect = element.getBoundingClientRect();
      const destination = calculateScrollTarget(rect.top, window.scrollY, offset);
      const effectiveBehavior = getEffectiveScrollBehavior(behavior, prefersReduced);

      const focusTarget = () => {
        if (!element.hasAttribute("tabindex")) {
          element.setAttribute("tabindex", "-1");
        }
        try {
          element.focus({ preventScroll: true });
        } catch {}
      };

      if (effectiveBehavior === "auto") {
        window.scrollTo({
          top: destination,
          behavior: "auto",
        });
        focusTarget();
        return;
      }

      const distance = destination - window.scrollY;
      const duration = calculateScrollDuration(distance);

      animateScroll(destination, duration, () => {
        focusTarget();
      });
    },
    [headerOffset, prefersReduced]
  );

  const scrollToTop = useCallback(
    (options: SmoothScrollOptions = {}) => {
      if (typeof window === "undefined") return;
      const { behavior = "smooth" } = options;
      const effectiveBehavior = getEffectiveScrollBehavior(behavior, prefersReduced);

      if (effectiveBehavior === "auto") {
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
        return;
      }

      const duration = calculateScrollDuration(window.scrollY);
      animateScroll(0, duration);
    },
    [prefersReduced]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleClick = (e: globalThis.MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const targetEl = e.target as HTMLElement | null;
      if (!targetEl) return;

      if (isInsideModal(targetEl)) {
        return;
      }

      const anchor = targetEl.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (isInternalAnchorLink(href, window.location.pathname)) {
        const hash = href.startsWith("#") ? href : href.slice(href.indexOf("#"));
        const targetId = hash.replace(/^#/, "");
        if (!targetId) return;

        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          scrollToTarget(target, { offset: headerOffset });
          if (window.history.pushState) {
            window.history.pushState(null, "", hash);
          }
        }
      }
    };

    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const targetId = hash.replace(/^#/, "");
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (target) {
        requestAnimationFrame(() => {
          scrollToTarget(target, { offset: headerOffset });
        });
      }
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("hashchange", handleHashNavigation);

    if (window.location.hash) {
      handleHashNavigation();
    }

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("hashchange", handleHashNavigation);
    };
  }, [headerOffset, scrollToTarget]);

  const contextValue = useMemo(
    () => ({ scrollToTarget, scrollToTop, prefersReduced }),
    [scrollToTarget, scrollToTop, prefersReduced]
  );

  return (
    <SmoothScrollContext.Provider value={contextValue}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

export interface SmoothScrollLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  offset?: number;
  children: ReactNode;
  onBeforeScroll?: () => void;
}

export function SmoothScrollLink({
  href,
  offset = 72,
  children,
  className,
  onClick,
  onBeforeScroll,
  ...props
}: SmoothScrollLinkProps) {
  const { scrollToTarget } = useSmoothScroll();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    if (href.startsWith("#")) {
      e.preventDefault();
      onBeforeScroll?.();
      scrollToTarget(href, { offset });
      if (typeof window !== "undefined" && window.history.pushState) {
        window.history.pushState(null, "", href);
      }
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}

export interface ScrollProgressBarProps {
  className?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function ScrollProgressBar({ className, containerRef }: ScrollProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const prefersReduced = usePrefersReducedMotion();
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || prefersReduced) return;

    const update = () => {
      let next = 0;
      if (containerRef?.current) {
        const el = containerRef.current;
        next = calculateScrollProgress(el.scrollTop, el.scrollHeight, el.clientHeight);
      } else {
        const doc = document.documentElement;
        next = calculateScrollProgress(
          window.scrollY || doc.scrollTop,
          doc.scrollHeight,
          window.innerHeight
        );
      }
      setProgress(next);
    };

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        update();
        rafRef.current = null;
      });
    };

    update();
    const target = containerRef?.current ?? window;
    target.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      target.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [containerRef, prefersReduced]);

  if (prefersReduced) return null;

  return (
    <div
      aria-hidden="true"
      className={cx(
        "pointer-events-none fixed inset-x-0 top-0 z-50 h-[2.5px] bg-transparent",
        className
      )}
    >
      <div
        className="h-full w-full bg-accent-600 transition-transform duration-75 ease-out"
        style={{
          transformOrigin: "0% 50%",
          transform: `scaleX(${progress}) translateZ(0)`,
          willChange: "transform",
        }}
      />
    </div>
  );
}

export interface ScrollToTopButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  threshold?: number;
  label?: string;
}

export function ScrollToTopButton({
  threshold = 320,
  label = "Kembali ke atas",
  className,
  ...props
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollToTop } = useSmoothScroll();
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        setIsVisible(window.scrollY > threshold);
        rafRef.current = null;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  return (
    <button
      type="button"
      onClick={() => scrollToTop()}
      aria-label={label}
      title={label}
      className={cx(
        "fixed bottom-6 right-6 z-30 inline-flex items-center justify-center size-10 rounded-full",
        "bg-background-primary-default/90 backdrop-blur-md border border-border-button-default",
        "text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover",
        "shadow-card transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring cursor-pointer",
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
        className
      )}
      {...props}
    >
      <RiArrowUpLine className="size-5" />
    </button>
  );
}
