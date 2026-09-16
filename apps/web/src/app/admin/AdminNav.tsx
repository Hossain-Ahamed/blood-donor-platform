"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Heart,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Requests", href: "/admin/requests", icon: Heart },
  { name: "Reports", href: "/admin/reports", icon: AlertTriangle },
  { name: "Audit Log", href: "/admin/audit-logs", icon: ShieldAlert },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <ul className="grid gap-1 px-2">
      {sidebarLinks.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(link.href + "/");
        const isActuallyActive =
          link.href === "/admin" ? pathname === "/admin" : isActive;

        const Icon = link.icon;

        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100",
                isActuallyActive
                  ? "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4",
                  isActuallyActive ? "text-red-700" : "text-zinc-500",
                )}
              />
              {link.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
