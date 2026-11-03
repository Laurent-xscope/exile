import type { Metadata } from "next";
import { Cinzel, Spectral } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "exile.org — Evaluasi & Asesmen Basa Bali Kurikulum Merdeka",
  description:
    "Platform evaluasi formatif terstruktur untuk guru dan siswa di Bali. Menyusun bahan ajar, kartu latihan, dan kuis kelas dengan deteksi miskonsepsi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${cinzel.variable} ${spectral.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#140D08] text-[#F5E6D3] font-serif selection:bg-[#CA8A04]/30 selection:text-[#F5E6D3]">
        {children}
        <Toaster
          theme="dark"
          richColors
          position="top-right"
          toastOptions={{
            style: {
              background: "#24160E",
              color: "#F5E6D3",
              border: "1px solid #4A2E1F",
            },
          }}
        />
      </body>
    </html>
  );
}
