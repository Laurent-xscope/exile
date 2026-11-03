"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { RiBookOpenLine, RiArrowRightLine, RiUserLine, RiHashtag } from "@remixicon/react";
import { toast } from "sonner";

export default function PlayJoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("garuda");
  const [loading, setLoading] = useState(false);

  const avatars = [
    { id: "garuda", label: "Garuda" },
    { id: "barong", label: "Barong" },
    { id: "dragon", label: "Naga" },
    { id: "lotus", label: "Padma" },
  ];

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().replace(/\s+/g, "");

    if (!cleanCode || cleanCode.length < 4) {
      toast.error("Masukkan 6 angka PIN kuis yang diberikan guru.");
      return;
    }

    if (!nickname.trim()) {
      toast.error("Masukkan nama panggilan kamu.");
      return;
    }

    setLoading(true);
    toast.loading("Menghubungkan ke ruang kuis...", { id: "join" });

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
      if (!res.ok) throw new Error(data.error || "Ruang kuis tidak ditemukan");

      toast.success(`Berhasil masuk ke ruang ${cleanCode}`, { id: "join" });

      localStorage.setItem("exile_player_id", data.playerId);
      localStorage.setItem("exile_player_nickname", nickname.trim());
      localStorage.setItem("exile_player_avatar", selectedAvatar);

      router.push(`/play/${cleanCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ruang kuis tidak ditemukan";
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
    <main className="min-h-screen bg-[#140D08] text-[#F5E6D3] flex flex-col justify-center items-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="max-w-md w-full bg-[#1A0F0A] border border-[#331F14] rounded-lg p-7 shadow-lg"
      >
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#331F14]">
          <div className="w-10 h-10 rounded bg-[#2C1A10] border border-[#CA8A04]/40 flex items-center justify-center text-[#CA8A04]">
            <RiBookOpenLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-[#F5E6D3]">exile.org</h1>
            <p className="text-xs text-[#BFA98A]">Ruang kuis siswa</p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#BFA98A] mb-1.5 flex items-center gap-1.5">
              <RiHashtag className="w-3.5 h-3.5 text-[#CA8A04]" />
              PIN ruang kuis (6 angka)
            </label>
            <input
              type="text"
              placeholder="Contoh: 849201"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={8}
              className="w-full text-center font-serif text-xl tracking-widest bg-[#140D08] border border-[#4A2E1F] focus:border-[#CA8A04] rounded py-2.5 px-4 text-[#F5E6D3] placeholder:text-[#5C3D2E] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#BFA98A] mb-1.5 flex items-center gap-1.5">
              <RiUserLine className="w-3.5 h-3.5 text-[#CA8A04]" />
              Nama panggilan
            </label>
            <input
              type="text"
              placeholder="Ketik nama kamu..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={24}
              className="w-full text-xs bg-[#140D08] border border-[#4A2E1F] focus:border-[#CA8A04] rounded py-2.5 px-3.5 text-[#F5E6D3] placeholder:text-[#5C3D2E] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#BFA98A] mb-1.5">
              Pilihan lambang karakter
            </label>
            <div className="grid grid-cols-4 gap-2">
              {avatars.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`py-2 px-1 text-center rounded text-xs transition border ${
                    selectedAvatar === av.id
                      ? "border-[#CA8A04] bg-[#CA8A04]/15 text-[#CA8A04] font-semibold"
                      : "border-[#4A2E1F] bg-[#140D08] text-[#BFA98A] hover:border-[#5C3D2E]"
                  }`}
                >
                  {av.label}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-2.5 px-4 rounded font-bold text-xs bg-[#CA8A04] hover:bg-[#D97706] text-[#140D08] transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-sm"
          >
            {loading ? (
              <span>Menghubungkan...</span>
            ) : (
              <>
                Masuk ke ruang kuis
                <RiArrowRightLine className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#331F14] text-center flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDemoJoin}
            className="text-xs text-[#CA8A04] hover:underline"
          >
            Uji coba cepat dengan PIN demo: 849201
          </button>

          <Link href="/" className="text-xs text-[#BFA98A] hover:text-[#F5E6D3] transition">
            Kembali ke beranda
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
