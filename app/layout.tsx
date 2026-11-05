import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWAInstall from "@/components/PWAInstall";

export const metadata: Metadata = {
  title: "JARVIS AI — Personal Intelligence",
  description: "Your personal AI assistant. Voice, memory-ready chat, and intelligent tools.",
  applicationName: "JARVIS AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/jarvis-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};
export const viewport: Viewport = {
  themeColor: "#050912",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PWAInstall />{children}</body></html>;
}
