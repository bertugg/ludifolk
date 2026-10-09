import Image from "next/image";
import Link from "next/link";
import appIcon from "@/app/icon.png";

/** The Ludifolk app icon, top-left on primary pages; always leads home. */
export function AppHomeLink() {
  return (
    <Link href="/" aria-label="Ludifolk home" className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
      <Image src={appIcon} alt="" width={32} height={32} className="size-8 rounded-lg" priority />
    </Link>
  );
}
