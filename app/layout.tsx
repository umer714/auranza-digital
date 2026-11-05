import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS AI — Personal Intelligence",
  description: "Your personal AI companion. Voice, memory-ready chat, and intelligent tools.",
  applicationName: "JARVIS AI",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  themeColor: "#070a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
