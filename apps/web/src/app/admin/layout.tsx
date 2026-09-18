import Link from "next/link";
import { redirect } from "next/navigation";
import { apiServer } from "@/lib/api/server";
import { AdminNav } from "./AdminNav";
import { UserNav } from "@/components/UserNav";
import { SmartAlertBell } from "@/components/SmartAlertBell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  try {
    const res = await apiServer.request<{ data: any }>("/users/me");
    user = res?.data || res;
  } catch (err) {
    redirect("/login");
  }

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      <aside className="w-64 flex-col border-r bg-white flex shrink-0">
        <div className="flex h-16 items-center border-b px-4 justify-between">
          <Link href="/admin" className="font-semibold text-lg text-red-600">
            Admin Panel
          </Link>
        </div>
        <nav className="flex-1 overflow-auto py-4">
          <AdminNav />
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SmartAlertBell />
              <UserNav user={user} isAdminLayout={true} />
            </div>
            <div className="text-sm font-medium">Admin User</div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
