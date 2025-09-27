import type { Metadata } from "next";
import "./globals.css";

import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import SessionWrapper from "@/lib/session";

export const metadata: Metadata = {
  title: "AOE2 Ligi",
  description: "AOE2 TR Ligi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionWrapper>
            <Header />
            {/* ✅ Fullwidth için max-w kaldırıldı */}
            <main className="w-full px-4 py-6">{children}</main>
            <Toaster />
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
