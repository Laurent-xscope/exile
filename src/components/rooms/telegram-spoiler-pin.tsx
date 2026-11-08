"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { motion } from "framer-motion";
import { cx } from "@/utils/cx";
import { toast } from "sonner";
import { soundEffects } from "@/lib/audio/sounds";

export interface TelegramSpoilerPinProps {
  pin: string;
  size?: "sm" | "md" | "lg";
  copyable?: boolean;
  className?: string;
  isEn?: boolean;
  label?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  maxLife?: number;
  life?: number;
}

export function TelegramSpoilerPin({
  pin,
  size = "md",
  copyable = true,
  className = "",
  isEn = false,
  label,
}: TelegramSpoilerPinProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isRevealed = isHovered;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const isBurstingRef = useRef(false);

  // Setup / teardown particle animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 60);
    const height = Math.max(rect.height, 24);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Initial speckle particles for Telegram spoiler noise
    const particleCount = size === "sm" ? 22 : size === "lg" ? 40 : 30;
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const particleColors = isDark
      ? ["#ffffff", "#d4d4d8", "#a1a1aa", "#38bdf8"]
      : ["#18181b", "#52525b", "#71717a", "#0284c7"];

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.6 + 0.8,
      alpha: Math.random() * 0.7 + 0.25,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
    }));

    let running = true;

    const render = () => {
      if (!running || !ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;

      if (!isRevealed) {
        // Continuous Telegram twinkling dust
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          // Twinkle effect
          p.alpha += (Math.random() - 0.5) * 0.08;
          if (p.alpha < 0.2) p.alpha = 0.2;
          if (p.alpha > 0.85) p.alpha = 0.85;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        animFrameRef.current = requestAnimationFrame(render);
      } else if (isBurstingRef.current) {
        // Active explosion particles
        let activeCount = 0;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.life !== undefined && p.life > 0) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.94; // friction
            p.vy *= 0.94;
            p.life -= 1;
            const progress = (p.maxLife! - p.life) / p.maxLife!;
            const alpha = (1 - progress) * 0.9;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
            ctx.fill();
            activeCount++;
          }
        }
        if (activeCount > 0) {
          animFrameRef.current = requestAnimationFrame(render);
        } else {
          isBurstingRef.current = false;
          ctx.clearRect(0, 0, width, height);
        }
      }
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRevealed, size]);

  const triggerBurst = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const burstColors = ["#0284c7", "#38bdf8", "#f59e0b", "#10b981", "#ffffff"];
    const burstParticles: Particle[] = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 2.8 + 1.2;
      burstParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2 + 1,
        alpha: 1,
        color: burstColors[Math.floor(Math.random() * burstColors.length)],
        life: 30,
        maxLife: 30,
      });
    }
    particlesRef.current = burstParticles;
    isBurstingRef.current = true;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const prevRevealedRef = useRef(false);
  useEffect(() => {
    if (isRevealed && !prevRevealedRef.current) {
      triggerBurst();
    }
    prevRevealedRef.current = isRevealed;
  }, [isRevealed, triggerBurst]);

  const handleClick = useCallback(() => {
    soundEffects.playClick();
    if (copyable) {
      navigator.clipboard.writeText(pin);
      toast.success(
        isEn
          ? `Room pin ${pin} copied to clipboard`
          : `Pin ruang ${pin} berhasil disalin`
      );
    }
  }, [copyable, pin, isEn]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const containerSizes = {
    sm: "px-2.5 py-1 gap-1.5 rounded-lg",
    md: "px-3 py-1.5 gap-2 rounded-xl",
    lg: "px-4 py-2 gap-3 rounded-2xl",
  };

  const fontSizes = {
    sm: "text-caption-1-semibold tracking-wider",
    md: "text-body-bold tracking-widest",
    lg: "text-title-2-medium tracking-widest",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={
        isEn
          ? `Room pin ${isRevealed ? pin : "obscured"}. Click to copy.`
          : `Pin ruang ${isRevealed ? pin : "tersembunyi"}. Klik untuk menyalin.`
      }
      title={
        isEn
          ? "Hover to reveal, click to copy"
          : "Arahkan kursor untuk melihat, klik untuk menyalin"
      }
      className={cx(
        "group relative inline-flex items-center select-none cursor-pointer transition-colors",
        "bg-background-secondary-default hover:bg-background-secondary-hover",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        containerSizes[size],
        className
      )}
    >
      {/* The PIN Container with Telegram spoiler effect */}
      <div className={cx(label ? "flex flex-col text-start justify-center" : "inline-flex items-center")}>
        {label && (
          <span className="text-[10px] text-text-secondary leading-none block select-none mb-0.5">
            {label}
          </span>
        )}
        <div className="relative inline-flex items-center justify-center overflow-hidden rounded-md px-1 py-0.5 min-w-[58px]">
          <bdi
            style={{
              filter: isRevealed ? "blur(0px)" : "blur(8px)",
              opacity: isRevealed ? 1 : 0.4,
              transition: "filter 180ms ease, opacity 180ms ease",
            }}
            className={cx(
              "font-mono text-text-primary tabular-nums select-none",
              fontSizes[size]
            )}
          >
            {pin}
          </bdi>

          {/* Telegram Canvas Particle Overlay */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none w-full h-full rounded-md"
          />

          {/* Shimmer sweep animation over blurred pin */}
          {!isRevealed && (
            <motion.div
              aria-hidden="true"
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut",
              }}
              className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-text-secondary/15 to-transparent w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
