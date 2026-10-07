import Link from "next/link";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A link styled like a Button. `<Button render={<Link />}>` looks tempting,
// but Base UI's Button forces role="button" + button keyboard semantics onto
// whatever it renders — which actively conflicts with an anchor's native
// link semantics (e.g. Space shouldn't activate a link). Style the Link
// directly with the same classes instead.
export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
