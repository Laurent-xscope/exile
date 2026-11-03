"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, ArrowRight, User, Hash, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function PlayJoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("garuda");
  const [loading, setLoading] = useState(false);

  const avatars = [
    { id: "garuda", label: "🦅 Garuda" },
    { id: "barong", label: "🦁 Barong" },
    { id: "dragon", label: "🐉 Naga" },
    { id: "lotus", label: "🪷 Padma" },
  ];

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().replace(/\s+/g, "");

    if (!cleanCode || cleanCode.length < 4) {
      toast.error("Masukkan 6-digit PIN Game Room yang valid!");
      return;
    }

    if (!nickname.trim()) {
      toast.error("Masukkan nama panggilan / nickname kamu!");
      return;
    }

    setLoading(true);
    toast.loading("Menghubungkan ke Game Room...", { id: "join" });

    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: cleanCode,
          nickname: nickname.trim(),
          avatar: selectedAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal masuk room kuis");

      toast.success(`Berhasil bergabung di room ${cleanCode}!`, { id: "join" });

      // Save player credentials locally for live game state tracking
      localStorage.setItem("exile_player_id", data.playerId);
      localStorage.setItem("exile_player_nickname", nickname.trim());
      localStorage.setItem("exile_player_avatar", selectedAvatar);

      router.push(`/play/${cleanCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Room tidak ditemukan";
      toast.error(msg, { id: "join" });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoJoin = () => {
    setRoomCode("849201");
    setNickname("Kadek Budi");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">exile.org</h1>
            <p className="text-xs text-indigo-400 font-medium">Student Game Arena</p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-indigo-400" />
              Game PIN (6-Digit)
            </label>
            <input
              type="text"
              placeholder="Contoh: 849201"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={8}
              className="w-full text-center font-mono text-2xl tracking-widest bg-zinc-950 border-2 border-zinc-800 rounded-2xl py-3.5 px-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-400" />
              Nama Panggilan / Nickname
            </label>
            <input
              type="text"
              placeholder="Ketik nama kamu..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={24}
              className="w-full text-sm bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Pilih Avatar Karakter
            </label>
            <div className="grid grid-cols-4 gap-2">
              {avatars.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-medium border transition ${
                    selectedAvatar === av.id
                      ? "border-indigo-500 bg-indigo-500/20 text-white shadow-md shadow-indigo-500/10"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {av.label}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading}
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-white shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 hover:opacity-95 transition disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Masuk Arena Kuis
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
          <button
            type="button"
            onClick={handleDemoJoin}
            className="text-xs text-zinc-400 hover:text-indigo-400 transition inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Pakai PIN Demo Juri: <span className="font-mono text-white underline">849201</span>
          </button>
        </div>
      </motion.div>
    </main>
  );
}
