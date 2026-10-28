import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BUSINESS } from "@/business";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: `Collab with ${BUSINESS.name}`,
  description: `Tell ${BUSINESS.name} about yourself and the collab you have in mind. About 2 minutes.`,
  openGraph: {
    title: `Collab with ${BUSINESS.name}`,
    description: `Tell ${BUSINESS.name} about yourself and the collab you have in mind. About 2 minutes.`,
    images: [BUSINESS.avatar],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
