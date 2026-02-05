import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./components/Nav";
import { Providers } from "./components/Providers";

export const metadata: Metadata = {
  title: "Ivy Lee Tracker",
  description: "Prioritized daily task management using the Ivy Lee Method",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-background)]" suppressHydrationWarning>
        <Providers>
          <Nav />
          <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
