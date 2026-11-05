import type { Metadata } from "next";
import { Archivo_Black, Space_Mono, Work_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { DirectionProvider } from "@/components/foundations/direction/direction";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { cx } from "@/utils/cx";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.exile.web.id"),
  title: "Exile — Closed-Loop Learning & Formative Assessment",
  description:
    "Platform evaluasi formatif terstruktur untuk guru dan siswa. Menyusun bahan ajar, kartu latihan 3D, dan kuis kelas real-time dengan penguatan pemahaman konsep.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
      className={cx("h-full", workSans.variable, archivoBlack.variable, spaceMono.variable)}
    >
      <body className="min-h-full flex flex-col bg-background-full text-text-primary font-sans antialiased">
        <DirectionProvider locale="id-ID">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange={false}
          >
            {children}
            <Toaster
              position="top-right"
              closeButton
              toastOptions={{
                style: {
                  borderRadius: 0,
                  border: "2px solid var(--vb-ink)",
                  background: "var(--vb-paper)",
                  color: "var(--vb-ink)",
                  boxShadow: "none",
                },
              }}
            />
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
