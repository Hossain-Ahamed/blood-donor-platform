import Link from "next/link";
import { redirect } from "next/navigation";
import { apiServer } from "@/lib/api/server";
import { MainNav } from "@/components/MainNav";
import { UserNav } from "@/components/UserNav";
import { SmartAlertBell } from "@/components/SmartAlertBell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  try {
    const res = await apiServer.request<{ data: any }>("/users/me");
    user = res?.data || res; // depending on the actual response structure
  } catch (err) {
    console.error("Failed to fetch /users/me in layout:", err);
    // If not authenticated, let them view public pages but they can't access UserNav
    // We can also redirect to login if we want the whole site to be private.
    // The requirement says "public page, not admin specific", meaning unauthenticated users should probably see the browse page.
    // If they MUST be logged in, we redirect:
    // redirect("/login");
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white dark:bg-zinc-900 sticky top-0 z-50">
        <Link className="flex items-center justify-center" href="/browse">
          <span className="font-bold text-xl text-red-600 dark:text-red-500">
            Blood Aid
          </span>
        </Link>

        <MainNav />

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <SmartAlertBell />
              <UserNav user={user} />
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
