import type { Metadata } from "next";
import { Montserrat, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

// Montserrat matches Ripples Operations; Noto Sans Thai covers Thai text.
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const notoThai = Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-noto-thai" });

export const metadata: Metadata = {
  title: "LiveOps Scheduler",
  description: "ระบบตารางไลฟ์ สำหรับทีม E-commerce Live Operation",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${montserrat.variable} ${notoThai.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
