import type { Metadata, Viewport } from "next";
import { Inter, Space_Mono, Fraunces } from "next/font/google";
import { SingleToastViewport } from "@/components/foundations/single-toaster/single-toaster";
import { DirectionProvider } from "@/components/foundations/direction/direction";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SmoothScrollProvider } from "@/components/foundations/smooth-scroll";
import { cx } from "@/utils/cx";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: true,
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.exile.web.id"),
  title: "Exile",
  description:
    "Platform evaluasi formatif terstruktur untuk guru dan siswa. Menyusun bahan ajar, kartu latihan 3d, dan kuis kelas real-time dengan penguatan pemahaman konsep.",
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
      className={cx("h-full", inter.variable, spaceMono.variable, fraunces.variable)}
    >
      <body className={cx("min-h-full flex flex-col bg-background-full text-text-primary font-sans antialiased", inter.className)}>
        <DirectionProvider locale="id-ID">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange={false}
          >
            <SmoothScrollProvider>
              {children}
              <SingleToastViewport />
            </SmoothScrollProvider>
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
