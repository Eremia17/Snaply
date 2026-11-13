import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./marketplace.css";

export const metadata: Metadata = {
  title: "AdEarn — Plateforme de micro-tâches",
  description: "Découvrez des micro-tâches, suivez vos soumissions et consultez vos récompenses confirmées sur AdEarn.",
  applicationName: "AdEarn",
};

export const viewport: Viewport = {
  themeColor: "#f7f8fc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
