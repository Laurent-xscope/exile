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
  type RefObject,
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

let activeAnimationCancel: (() => void) | null = null;
let savedHtmlScrollBehavior: string | null = null;

export function getActiveAnimationStatus(): boolean {
  return activeAnimationCancel !== null;
}

export function cancelActiveScroll(): void {
  if (activeAnimationCancel !== null) {
    activeAnimationCancel();
    activeAnimationCancel = null;
  }
}

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

export function calculateScrollTarget(
  targetTop: number,
  currentScrollY: number,
  offset = 72
): number {
  return Math.max(0, Math.round(targetTop + currentScrollY - offset));
}

export function calculateScrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const scrollable = scrollHeight - clientHeight;
  if (scrollable <= 0) return 0;
  return Math.min(1, Math.max(0, scrollTop / scrollable));
}

export function getEffectiveScrollBehavior(
  requested: "smooth" | "auto" = "smooth",
  prefersReduced = false
): ScrollBehavior {
  if (prefersReduced) return "auto";
  return requested;
}

export function easeOutQuart(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - clamped, 4);
}

export function calculateScrollDuration(distance: number): number {
  const abs = Math.abs(distance);
  if (abs === 0) return 0;
  return Math.min(680, Math.max(320, Math.round(Math.sqrt(abs) * 15)));
}

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

export function focusTargetElement(element: HTMLElement | null): void {
  if (!element) return;
  if (!element.hasAttribute("tabindex")) {
    element.setAttribute("tabindex", "-1");
  }
  try {
    element.focus({ preventScroll: true });
  } catch {
    // Fallback for older browsers
  }
}

export function findAnchorElement(target: string | HTMLElement): HTMLElement | null {
  if (typeof target !== "string") return target;

  let raw = target;
  if (raw.includes("#")) {
    raw = raw.slice(raw.indexOf("#") + 1);
  }

  if (!raw) return null;

  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    id = raw;
  }

  const byId = document.getElementById(id);
  if (byId) return byId;

  const escapedId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
  const byName = document.querySelector<HTMLElement>(`[name="${escapedId}"]`);
  return byName;
}

export function animateScroll(
  destinationY: number,
  duration: number,
  onComplete?: () => void
): () => void {
  if (typeof window === "undefined") {
    onComplete?.();
    return () => {};
  }

  if (activeAnimationCancel !== null) {
    activeAnimationCancel();
    activeAnimationCancel = null;
  }

  const html = document.documentElement;
  if (savedHtmlScrollBehavior === null) {
    savedHtmlScrollBehavior = html.style.scrollBehavior;
  }
  html.style.scrollBehavior = "auto";

  const startY = window.scrollY || html.scrollTop;
  const maxScrollY = Math.max(0, html.scrollHeight - window.innerHeight);
  const clampedDestination = Math.min(Math.max(0, destinationY), maxScrollY);
  const distance = clampedDestination - startY;

  if (Math.abs(distance) < 2 || duration <= 0) {
    window.scrollTo(0, clampedDestination);
    html.style.scrollBehavior = savedHtmlScrollBehavior ?? "";
    savedHtmlScrollBehavior = null;
    onComplete?.();
    return () => {};
  }

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
    if (activeAnimationCancel === cancel) {
      activeAnimationCancel = null;
      html.style.scrollBehavior = savedHtmlScrollBehavior ?? "";
      savedHtmlScrollBehavior = null;
    }
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

  activeAnimationCancel = cancel;

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
      if (activeAnimationCancel === cancel) {
        activeAnimationCancel = null;
        html.style.scrollBehavior = savedHtmlScrollBehavior ?? "";
        savedHtmlScrollBehavior = null;
      }
      onComplete?.();
    }
  };

  rafId = requestAnimationFrame(step);
  return cancel;
}

function performScrollToTarget(
  target: string | HTMLElement,
  options: SmoothScrollOptions,
  prefersReduced: boolean,
  defaultOffset = 72
) {
  if (typeof window === "undefined") return;

  const { offset = defaultOffset, behavior = "smooth" } = options;
  const element = findAnchorElement(target);
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const destination = calculateScrollTarget(rect.top, window.scrollY, offset);
  const effectiveBehavior = getEffectiveScrollBehavior(behavior, prefersReduced);

  if (effectiveBehavior === "auto") {
    window.scrollTo({
      top: destination,
      behavior: "auto",
    });
    focusTargetElement(element);
    return;
  }

  const distance = destination - window.scrollY;
  const duration = calculateScrollDuration(distance);

  animateScroll(destination, duration, () => {
    focusTargetElement(element);
  });
}

function performScrollToTop(
  options: SmoothScrollOptions,
  prefersReduced: boolean
) {
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
}

export function useSmoothScroll() {
  const context = useContext(SmoothScrollContext);
  const localPrefersReduced = usePrefersReducedMotion();

  const prefersReduced = context ? context.prefersReduced : localPrefersReduced;

  const scrollToTarget = useCallback(
    (target: string | HTMLElement, options: SmoothScrollOptions = {}) => {
      performScrollToTarget(target, options, prefersReduced);
    },
    [prefersReduced]
  );

  const scrollToTop = useCallback(
    (options: SmoothScrollOptions = {}) => {
      performScrollToTop(options, prefersReduced);
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

export function SmoothScrollProvider({
  children,
  headerOffset = 72,
}: SmoothScrollProviderProps) {
  const prefersReduced = usePrefersReducedMotion();

  const scrollToTarget = useCallback(
    (target: string | HTMLElement, options: SmoothScrollOptions = {}) => {
      performScrollToTarget(target, options, prefersReduced, headerOffset);
    },
    [headerOffset, prefersReduced]
  );

  const scrollToTop = useCallback(
    (options: SmoothScrollOptions = {}) => {
      performScrollToTop(options, prefersReduced);
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
      if (!targetEl || isInsideModal(targetEl)) {
        return;
      }

      const anchor = targetEl.closest("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (isInternalAnchorLink(href, window.location.pathname)) {
        const hash = href.startsWith("#") ? href : href.slice(href.indexOf("#"));
        const target = findAnchorElement(hash);
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
      const target = findAnchorElement(hash);
      if (target) {
        requestAnimationFrame(() => {
          scrollToTarget(target, { offset: headerOffset });
        });
      }
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("hashchange", handleHashNavigation);
    window.addEventListener("popstate", handleHashNavigation);

    if (window.location.hash) {
      handleHashNavigation();
    }

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("hashchange", handleHashNavigation);
      window.removeEventListener("popstate", handleHashNavigation);
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

    const currentPathname = typeof window !== "undefined" ? window.location.pathname : "/";
    if (isInternalAnchorLink(href, currentPathname)) {
      e.preventDefault();
      onBeforeScroll?.();
      const hash = href.startsWith("#") ? href : href.slice(href.indexOf("#"));
      scrollToTarget(hash, { offset });
      if (typeof window !== "undefined" && window.history.pushState) {
        window.history.pushState(null, "", hash);
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
  containerRef?: RefObject<HTMLElement | null>;
}

export function ScrollProgressBar({ className, containerRef }: ScrollProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined" || prefersReduced) return;

    let rafId: number | null = null;

    const update = () => {
      let progress = 0;
      if (containerRef?.current) {
        const el = containerRef.current;
        progress = calculateScrollProgress(el.scrollTop, el.scrollHeight, el.clientHeight);
      } else {
        const doc = document.documentElement;
        progress = calculateScrollProgress(
          window.scrollY || doc.scrollTop,
          doc.scrollHeight,
          window.innerHeight
        );
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress}) translateZ(0)`;
      }
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        update();
        rafId = null;
      });
    };

    update();

    const target = containerRef?.current ?? window;
    target.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
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
        "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent",
        className
      )}
    >
      <div
        ref={barRef}
        className="h-full w-full bg-accent-600 origin-left"
        style={{
          transform: "scaleX(0)",
        }}
      />
    </div>
  );
}

export interface ScrollToTopButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  threshold?: number;
  label?: string;
  className?: string;
}

export function ScrollToTopButton({
  threshold = 320,
  label = "Kembali ke atas",
  className,
  ...props
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isVisibleRef = useRef(false);
  const { scrollToTop } = useSmoothScroll();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        const next = window.scrollY > threshold;
        if (isVisibleRef.current !== next) {
          isVisibleRef.current = next;
          setIsVisible(next);
        }
        rafId = null;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
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
        "fixed bottom-6 end-6 z-30 inline-flex items-center justify-center size-10 rounded-full",
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
