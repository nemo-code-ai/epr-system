import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/AppProvider";

export const metadata: Metadata = { title: "EPR System" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
