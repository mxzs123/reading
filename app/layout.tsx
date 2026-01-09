import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Instrument_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { PWARegistry } from "@/components/PWARegistry";
import "./globals.css";

// 标题字体 - 优雅衬线体
const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// UI 元素字体 - 现代无衬线
const instrumentSans = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "仿生阅读器 毛毛浩浩 版",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "仿生阅读",
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#b8860b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${cormorant.variable} ${instrumentSans.variable}`}>
        <Providers>
          <PWARegistry />
          {children}
        </Providers>
      </body>
    </html>
  );
}
