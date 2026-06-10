import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import GlobalStatsPanel from "@/components/GlobalStatsPanel";
import BuildUrlLoader from "@/components/BuildUrlLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PoE 2 Build-Planer",
  description:
    "Path of Exile 2 Build-Planer für die deutsche Community – Importiere, übersetze und plane deine Builds auf Deutsch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <BuildUrlLoader />
        <Navbar />
        <main className="flex-1">{children}</main>
        {/* GlobalStatsPanel als Overlay — auf jeder Route sichtbar */}
        <GlobalStatsPanel />
      </body>
    </html>
  );
}
