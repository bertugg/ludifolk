"use client";

import { useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { searchMentionCandidates, type MentionCandidate } from "@/lib/actions/mentions";
import { cn } from "@/lib/utils";

// The "@partial" being typed right before the caret, if any. Same
// boundary rule as MENTION_PATTERN in lib/mentions.ts.
const TOKEN_BEFORE_CARET = /(?:^|[^a-z0-9_.])@([a-z0-9_]{1,20})$/i;

/**
 * Uncontrolled textarea that suggests usernames while an @tag is being
 * typed. Picking one inserts "@username " in place of the partial tag.
 */
export function MentionTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestRequest = useRef(0);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  function close() {
    latestRequest.current++;
    setCandidates([]);
  }

  function refresh() {
    const el = textareaRef.current;
    if (!el) return;
    const token = el.value.slice(0, el.selectionStart).match(TOKEN_BEFORE_CARET)?.[1];
    if (!token) return close();

    const requestId = ++latestRequest.current;
    searchMentionCandidates(token).then((results) => {
      // Drop responses that arrive after a newer keystroke.
      if (requestId !== latestRequest.current) return;
      setCandidates(results);
      setActiveIndex(0);
    });
  }

  function select(username: string) {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = el.value.slice(0, caret).replace(/@[a-z0-9_]*$/i, `@${username} `);
    el.value = before + el.value.slice(caret);
    el.setSelectionRange(before.length, before.length);
    el.focus();
    close();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (candidates.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + candidates.length) % candidates.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      select(candidates[activeIndex].username);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Textarea
        {...props}
        ref={textareaRef}
        onInput={refresh}
        onClick={refresh}
        onKeyDown={handleKeyDown}
        onBlur={close}
        role="combobox"
        aria-expanded={candidates.length > 0}
        aria-autocomplete="list"
      />
      {candidates.length > 0 && (
        <ul
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-md"
        >
          {candidates.map((c, i) => (
            <li
              key={c.username}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown, not click: fires before the textarea's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                select(c.username);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm",
                i === activeIndex && "bg-muted",
              )}
            >
              <Avatar size="sm" className="size-6">
                <AvatarImage src={c.avatar_url ?? undefined} alt={c.username} />
                <AvatarFallback className="text-[10px]">
                  {(c.display_name || c.username).slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{c.display_name || c.username}</span>
              <span className="text-muted-foreground">@{c.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
