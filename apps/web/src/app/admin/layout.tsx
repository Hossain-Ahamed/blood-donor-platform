"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin" },
  { name: "Users", href: "/admin/users" },
  { name: "Requests", href: "/admin/requests" },
  { name: "Reports", href: "/admin/reports" },
  { name: "Audit Log", href: "/admin/audit-logs" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/");
      } else if (user.role !== "ADMIN") {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      <aside className="w-64 flex-col border-r bg-white flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/admin" className="font-semibold text-lg">Admin Panel</Link>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <ul className="grid gap-1 px-2">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              // Fix exact match for dashboard
              const isActuallyActive = link.href === "/admin" ? pathname === "/admin" : isActive;
              
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                      isActuallyActive ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    {link.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

