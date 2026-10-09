import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import "./globals.css";

// Typography: Manrope is the app font for everything (UI, headings, numbers).
// Newsreader is an editorial accent for story-like content only — see the
// type-* utilities in globals.css. Both are variable fonts, so one file each
// covers every weight (200–800); Manrope has no italic, Newsreader does.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  // An occasional accent, not needed for first paint on most pages.
  preload: false,
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
      className={`${manrope.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className={cn("flex flex-1 flex-col", showNav && "pb-16")}>{children}</div>
        {showNav && <BottomNav />}
      </body>
    </html>
  );
}
