import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Polyhedge",
  description: "Delta-neutral hedging strategies with Polymarket and GMX",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
