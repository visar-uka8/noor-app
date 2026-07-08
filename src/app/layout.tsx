import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ElderModeProvider } from "@/components/ElderModeProvider";
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
    <html lang="de" className={`${inter.variable} h-full overflow-x-hidden`}>
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <ElderModeProvider>
          <div className="page-fade flex min-h-full flex-1 flex-col overflow-x-hidden">
            {children}
          </div>
        </ElderModeProvider>
      </body>
    </html>
  );
}
