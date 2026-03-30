import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "@/app/globals.css";

const uiFont = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Attestly V3",
  description: "Evidence-first security questionnaire autofill with citations, review, and export."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={uiFont.variable}>
      <body>{children}</body>
    </html>
  );
}
