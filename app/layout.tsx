import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeAtlas — Your taste is a map",
  description:
    "VibeAtlas turns what you already love — music, films, fashion, food — into a personalised day plan, grounded in Qloo's taste graph with visible affinity and explainability.",
  openGraph: {
    title: "VibeAtlas — Your taste is a map",
    description:
      "Turn your taste into one coherent day, ranked by Qloo affinity with Why This Match evidence, veto and re-plan.",
    url: "https://vibeatlas-mrsarimofficials-projects.vercel.app/",
    siteName: "VibeAtlas",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeAtlas — Your taste is a map",
    description:
      "Turn your taste into one coherent day, ranked by Qloo affinity with Why This Match evidence, veto and re-plan.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
