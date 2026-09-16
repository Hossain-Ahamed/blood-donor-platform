"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="ml-6 hidden md:flex gap-4 sm:gap-6">
      <Link
        className={cn(
          "text-sm font-medium transition-colors hover:text-red-600",
          pathname?.startsWith("/browse")
            ? "text-red-600"
            : "text-zinc-600 dark:text-zinc-400",
        )}
        href="/browse"
      >
        Browse
      </Link>
      <Link
        className={cn(
          "text-sm font-medium transition-colors hover:text-red-600",
          pathname?.startsWith("/requests")
            ? "text-red-600"
            : "text-zinc-600 dark:text-zinc-400",
        )}
        href="/requests"
      >
        Request Blood
      </Link>
      <Link
        className={cn(
          "text-sm font-medium transition-colors hover:text-red-600",
          pathname?.startsWith("/history")
            ? "text-red-600"
            : "text-zinc-600 dark:text-zinc-400",
        )}
        href="/history"
      >
        History
      </Link>
    </nav>
  );
}
