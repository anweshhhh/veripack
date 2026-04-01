import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "@/app/globals.css";

const uiFont = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Veripack",
  description: "Evidence-first security questionnaire autofill with citations, review, and export."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={uiFont.variable}>
      <body>{children}</body>
    </html>
  );
}
