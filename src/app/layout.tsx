import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ludifolk",
  description: "Log what happened at game night.",
  // iOS "Add to Home Screen" counterpart of the web manifest.
  appleWebApp: { capable: true, title: "Ludifolk", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Status bar / browser chrome color — matches the cream app background.
  themeColor: "#fbf5ee",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const showNav = !!auth.user;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className={cn("flex flex-1 flex-col", showNav && "pb-16")}>{children}</div>
        {showNav && <BottomNav />}
      </body>
    </html>
  );
}
