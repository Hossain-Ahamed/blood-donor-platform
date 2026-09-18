"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainNav({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="ml-2.5 sm:ml-6 flex items-center gap-1.5 sm:gap-4 md:gap-6">
      <Link
        className={cn(
          "text-xs sm:text-sm font-medium transition-colors px-2 py-1 rounded-md hover:text-red-600",
          pathname?.startsWith("/browse")
            ? "text-red-600 font-semibold bg-red-50 dark:bg-red-950/40"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-muted/50",
        )}
        href="/browse"
      >
        Browse
      </Link>
      <Link
        className={cn(
          "text-xs sm:text-sm font-semibold transition-all px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm",
          pathname?.startsWith("/requests")
            ? "bg-red-600 text-white shadow-red-500/20"
            : "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-400 hover:bg-red-600 hover:text-white",
        )}
        href={isLoggedIn ? "/requests" : "/login?redirect=/requests"}
      >
        <span className="text-sm font-bold leading-none">+</span>
        <span>Request</span>
        <span className="hidden sm:inline">Blood</span>
      </Link>
      {isLoggedIn && (
        <>
          <Link
            className={cn(
              "text-xs sm:text-sm font-medium transition-colors px-2 py-1 rounded-md hover:text-red-600 hidden xs:inline-block sm:inline-block",
              pathname?.startsWith("/history")
                ? "text-red-600 font-semibold bg-red-50 dark:bg-red-950/40"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-muted/50",
            )}
            href="/history"
          >
            History
          </Link>
          <Link
            className={cn(
              "text-xs sm:text-sm font-medium transition-colors px-2 py-1 rounded-md hover:text-red-600 hidden xs:inline-block sm:inline-block",
              pathname?.startsWith("/friends")
                ? "text-red-600 font-semibold bg-red-50 dark:bg-red-950/40"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-muted/50",
            )}
            href="/friends"
          >
            Friends
          </Link>
        </>
      )}
    </nav>
  );
}
