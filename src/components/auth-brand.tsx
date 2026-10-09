import Image from "next/image";
import appIcon from "@/app/icon.png";

/** App icon with the Ludifolk wordmark under it, above the login/signup card. */
export function AuthBrand() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Image src={appIcon} alt="" width={72} height={72} className="size-18 rounded-2xl shadow-sm" priority />
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground">Ludifolk</h1>
    </div>
  );
}
