import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdEarn — Des missions claires, des règles transparentes",
  description: "AdEarn, une plateforme de micro-missions avec des conditions visibles et un suivi transparent.",
  applicationName: "AdEarn",
};

export const viewport: Viewport = {
  themeColor: "#f7f9fc",
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
