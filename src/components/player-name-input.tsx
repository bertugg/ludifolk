"use client";

import { useState, type KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PlayerSuggestion = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const MAX_SUGGESTIONS = 5;

/**
 * Free-text player name field that, once typing starts, suggests matching
 * people from `suggestions` (the logger's follows). Picking one fills in the
 * username, which the log action resolves to that account; anything else
 * stays a guest name.
 */
export function PlayerNameInput({
  name,
  value,
  onChange,
  suggestions,
  placeholder,
  className,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: PlayerSuggestion[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const query = value.trim().toLowerCase();
  const matches = query
    ? suggestions
        .filter(
          (s) =>
            s.username.toLowerCase() !== query &&
            (s.username.toLowerCase().includes(query) || s.display_name?.toLowerCase().includes(query)),
        )
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const showList = open && matches.length > 0;

  function select(username: string) {
    onChange(username);
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(matches[Math.min(activeIndex, matches.length - 1)].username);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        name={name}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
      />
      {showList && (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-20 mt-1 w-max max-w-[min(20rem,calc(100vw-3rem))] min-w-full overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-md"
        >
          {matches.map((s, i) => (
            <li
              key={s.username}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown, not click: fires before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                select(s.username);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm",
                i === activeIndex && "bg-muted",
              )}
            >
              <Avatar size="sm" className="size-6">
                <AvatarImage src={s.avatar_url ?? undefined} alt={s.username} />
                <AvatarFallback className="text-[10px]">
                  {(s.display_name || s.username).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{s.display_name || s.username}</span>
              <span className="truncate text-muted-foreground">@{s.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
