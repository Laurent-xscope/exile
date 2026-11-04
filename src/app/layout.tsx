import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { DirectionProvider } from "@/components/foundations/direction/direction";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { cx } from "@/utils/cx";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-source",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exile — Asesmen Formatif & Pembelajaran Budaya Bali",
  description:
    "Platform evaluasi formatif terstruktur untuk guru dan siswa. Menyusun bahan ajar, kartu latihan 3D, dan kuis kelas real-time dengan deteksi miskonsepsi cerdas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      dir="ltr"
      suppressHydrationWarning
      className={cx("h-full", inter.variable, jetbrainsMono.variable)}
    >
      <body className="min-h-full flex flex-col bg-background-full text-text-primary font-sans antialiased">
        <DirectionProvider locale="id-ID">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
          >
            {children}
            <Toaster
              richColors
              position="top-right"
              closeButton
            />
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
