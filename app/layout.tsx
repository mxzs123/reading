import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { PWARegistry } from "@/components/PWARegistry";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "仿生阅读器 Next 版",
  description: "基于 Next.js 的仿生阅读器，支持多端访问",
  manifest: "/manifest.webmanifest",
  themeColor: "#0f766e",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <PWARegistry />
          {children}
        </Providers>
      </body>
    </html>
  );
}
