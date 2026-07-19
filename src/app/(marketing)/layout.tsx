import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./marketing.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Noor — Ihre Gesundheit, endlich verständlich",
  description:
    "Noor erklärt Ihre Laborwerte auf einfachem Deutsch und verbindet Sie mit Ihrer Familie. Kostenlos starten.",
  openGraph: {
    title: "Noor — Licht auf Ihre Gesundheit",
    description:
      "Laborwerte verstehen. Medikamente im Blick. Familie verbinden.",
    type: "website",
    locale: "de_DE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1D9E75",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`marketing-shell ${dmSans.variable} ${dmSerif.variable}`}
    >
      {children}
    </div>
  );
}
