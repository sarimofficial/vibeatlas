import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeAtlas — Your taste is a map",
  description:
    "VibeAtlas turns what you already love — music, films, fashion, food — into a personalised day plan, grounded in Qloo's taste graph with visible affinity and explainability.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
