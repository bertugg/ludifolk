"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 50;

/**
 * Session photo thumbnails that open a full-screen viewer on click.
 * "strip" is the feed's four-slot row (three photos plus a "+N" tile once
 * there are more than four); "grid" is the session page's three-column grid.
 */
export function PhotoGallery({ urls, variant }: { urls: string[]; variant: "strip" | "grid" }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (urls.length === 0) return null;

  const isStrip = variant === "strip";
  const shown = isStrip && urls.length > 4 ? urls.slice(0, 3) : urls;
  const hiddenCount = urls.length - shown.length;
  const thumbClass = cn("relative overflow-hidden rounded-lg bg-muted", isStrip ? "aspect-4/3" : "aspect-square");

  return (
    <>
      <div className={cn("grid gap-2", isStrip ? "grid-cols-4" : "grid-cols-3")}>
        {shown.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`View photo ${i + 1} of ${urls.length}`}
            className={cn(thumbClass, "cursor-zoom-in focus-visible:ring-2 focus-visible:ring-ring")}
          >
            <Image src={url} alt="" fill className="object-cover" sizes={isStrip ? "96px" : "224px"} />
          </button>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setOpenIndex(shown.length)}
            aria-label={`View ${hiddenCount} more photos`}
            className={cn(thumbClass, "flex items-center justify-center text-sm font-medium text-foreground/70")}
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      {openIndex !== null && (
        <PhotoViewer urls={urls} index={openIndex} onIndexChange={setOpenIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}

function PhotoViewer({
  urls,
  index,
  onIndexChange,
  onClose,
}: {
  urls: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const hasMany = urls.length > 1;

  function go(step: number) {
    onIndexChange((index + step + urls.length) % urls.length);
  }

  // Latest navigation for the keydown listener, without re-subscribing each render.
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goRef.current(1);
      else if (e.key === "ArrowLeft") goRef.current(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null || !hasMany) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX) go(dx < 0 ? 1 : -1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${urls.length}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      // Backdrop click closes; clicks on the photo or controls don't reach here.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      <div className="pointer-events-none relative h-[85vh] w-full max-w-4xl">
        <Image src={urls[index]} alt={`Photo ${index + 1}`} fill className="object-contain" sizes="100vw" priority />
      </div>

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <XIcon className="size-5" />
      </button>

      {hasMany && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute left-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute right-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRightIcon className="size-5" />
          </button>
          <p className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-sm text-white/80 tabular-nums">
            {index + 1} / {urls.length}
          </p>
        </>
      )}
    </div>
  );
}
