import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ElderModeProvider } from "@/components/ElderModeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { fontSizeBootScript } from "@/lib/font-size";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Noor – Gesundheit für die Familie",
  description:
    "Gesundheitsapp für ältere Patienten in Deutschland und ihre Angehörigen.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1D9E75",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning className={inter.variable}>
      <body>
        <Script id="font-size-boot" strategy="beforeInteractive">
          {fontSizeBootScript}
        </Script>
        <LanguageProvider>
          <ElderModeProvider>
            <OfflineBanner />
            <div className="app-root page-fade">{children}</div>
          </ElderModeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
