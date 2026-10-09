"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dice5Icon, HomeIcon, PlusIcon, UserIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/games", label: "Games", icon: Dice5Icon },
  { href: "/log", label: "Log", icon: PlusIcon, isFab: true },
  { href: "/groups", label: "Groups", icon: UsersIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  // Onboarding is a single focused step — no way out until it's done.
  if (pathname === "/welcome") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-2">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          if ("isFab" in item && item.isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="-mt-7 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35 transition-transform active:scale-95"
              >
                <Icon className="size-7" strokeWidth={2.25} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium",
                active ? "text-primary" : "text-foreground/80",
              )}
            >
              {/* Reference marks the active tab with a filled glyph. */}
              <Icon className={cn("size-6", active && "fill-primary/15")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
