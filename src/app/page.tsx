"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  Sparkles,
  Rocket,
  Zap,
  Terminal,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  Code2,
} from "lucide-react";

interface Idea {
  id: string;
  title: string;
  wedge: string;
  rubricScore: number;
  techStack: string[];
  hook: string;
}

export default function Home() {
  const [theme, setTheme] = useState("");
  const [track, setTrack] = useState("AI Agents & Tooling");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedTab, setSelectedTab] = useState<"ideate" | "stack" | "rubric">("ideate");

  const handleBrainstorm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) {
      toast.error("Please enter a hackathon theme or problem statement");
      return;
    }

    setLoading(true);
    toast.loading("Analyzing hackathon sponsor tracks & rubrics...", { id: "storm" });

    try {
      const res = await fetch("/api/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, track }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Brainstorm failed");

      setIdeas(data.ideas);
      toast.success("Generated top-scoring MVP concepts!", { id: "storm" });

      // Trigger confetti celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error running brainstorm";
      toast.error(msg, { id: "storm" });
    } finally {
      setLoading(false);
    }
  };

  const triggerLiveDemoConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
    });
    toast.success("Demo Climax Triggered! 3-minute pitch checkpoint passed.");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white flex items-center gap-2">
                HAKACTHON <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">MVP Engine</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={triggerLiveDemoConfetti}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Test Celebration
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Ready to hack
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-medium mb-4">
            <Rocket className="w-3.5 h-3.5" /> Full-Stack Production Launchpad
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
            Build the winning MVP <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
              before the other teams finish boilerplate.
            </span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
            Wired with Next.js 15, Framer Motion, Tailwind v4, Supabase, and Zod.
            Designed for 10x execution velocity from brainstorm to live stage demo.
          </p>
        </motion.div>

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-800 mb-8 gap-6">
          <button
            onClick={() => setSelectedTab("ideate")}
            className={`pb-3 text-sm font-medium transition relative flex items-center gap-2 ${
              selectedTab === "ideate" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="w-4 h-4" />
            Instant Idea Generator
            {selectedTab === "ideate" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>

          <button
            onClick={() => setSelectedTab("stack")}
            className={`pb-3 text-sm font-medium transition relative flex items-center gap-2 ${
              selectedTab === "stack" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            Installed Stack & Tools
            {selectedTab === "stack" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>

          <button
            onClick={() => setSelectedTab("rubric")}
            className={`pb-3 text-sm font-medium transition relative flex items-center gap-2 ${
              selectedTab === "rubric" ? "text-indigo-400" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Winning Criteria & Demo Flow
            {selectedTab === "rubric" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {selectedTab === "ideate" && (
            <motion.div
              key="ideate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Form Card */}
              <div className="lg:col-span-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  Hackathon Brainstorm Engine
                </h2>
                <p className="text-xs text-zinc-400 mb-6">
                  Input your problem statement or keywords to extract high-scoring MVP blueprints.
                </p>

                <form onSubmit={handleBrainstorm} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Hackathon Theme / Domain
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Autonomous DevOps, Healthcare AI, Web3 Security"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Sponsor / Priority Track
                    </label>
                    <select
                      value={track}
                      onChange={(e) => setTrack(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    >
                      <option>AI Agents & Tooling</option>
                      <option>Best Use of Next.js & Edge</option>
                      <option>Database & Real-time Sync</option>
                      <option>High Social Impact</option>
                      <option>Cybersecurity & Defense</option>
                    </select>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={loading}
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:opacity-95 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Generating Architecture...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Winning MVP Concepts
                      </>
                    )}
                  </motion.button>
                </form>
              </div>

              {/* Ideas Output */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {ideas.length === 0 ? (
                  <div className="h-full border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-zinc-900/20">
                    <Code2 className="w-10 h-10 text-zinc-600 mb-3" />
                    <h3 className="text-zinc-300 text-sm font-medium mb-1">
                      No concepts generated yet
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-sm">
                      Type your theme on the left and run the brainstorm engine to preview architectural wedges and pitch hooks.
                    </p>
                  </div>
                ) : (
                  ideas.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold text-white group-hover:text-indigo-400 transition flex items-center gap-2">
                          {item.title}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ★ {item.rubricScore} Rubric
                          </span>
                        </h3>
                        <span className="text-xs text-zinc-500 font-mono">#{item.id}</span>
                      </div>

                      <p className="text-xs text-zinc-300 mb-3 font-medium">{item.wedge}</p>

                      <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl mb-3">
                        <span className="text-[11px] font-semibold text-indigo-400 block mb-1">
                          THE 3-MINUTE PITCH HOOK:
                        </span>
                        <p className="text-xs text-zinc-400 italic">"{item.hook}"</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {selectedTab === "stack" && (
            <motion.div
              key="stack"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white mb-2">Framer Motion v14</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Physics-based layout springs, drag physics, micro-interactions, and tab morphing for an instantly premium user feel.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">import &#123; motion &#125; from "framer-motion"</div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white mb-2">Supabase & PostgreSQL</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Relational database persistence, Row Level Security, pgvector for semantic search, and instantaneous auth configured in <code>src/lib/supabase.ts</code>.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">import &#123; supabase &#125; from "@/lib/supabase"</div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white mb-2">Sonner & Canvas Confetti</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Visual feedback loops that reward user actions and create stage-ready demo moments that stick in judges' memories.
                </p>
                <div className="text-[11px] font-mono text-zinc-500">import &#123; toast &#125; from "sonner"</div>
              </div>
            </motion.div>
          )}

          {selectedTab === "rubric" && (
            <motion.div
              key="rubric"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 max-w-4xl"
            >
              <h2 className="text-xl font-bold text-white mb-4">The 3-Minute Demo Runbook</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Minute 0:00 - 0:45: The Wedge</h4>
                    <p className="text-xs text-zinc-400">
                      Skip introductory fluff. State the single excruciating problem, why existing products fail, and what you built to solve it.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Minute 0:45 - 2:00: The Live Action</h4>
                    <p className="text-xs text-zinc-400">
                      Show the deployed URL live. Trigger an automated task or agent flow. Show real data flowing and persisting to the database.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Minute 2:00 - 3:00: Technical Proof & Climax</h4>
                    <p className="text-xs text-zinc-400">
                      Point out the non-trivial architectural engineering (e.g. pgvector, streaming SSE, deterministic fallbacks). End with a celebration payoff.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-850 py-6 text-center text-xs text-zinc-500">
        Hakacthon MVP Starter • Built with Next.js 15, Framer Motion, Tailwind v4, & Supabase
      </footer>
    </main>
  );
}
