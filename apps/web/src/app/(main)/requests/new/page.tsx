import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiServer } from "@/lib/api/server";
import type { User } from "@repo/shared";
import { RequestForm } from "../RequestForm";

export default async function NewRequestPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    redirect("/login?redirect=/requests/new");
  }

  let user: User | null = null;
  try {
    const userRes = await apiServer.request<{ data: User } | User>("/users/me");
    user = "data" in userRes && userRes.data ? userRes.data : (userRes as User);
  } catch {
    // continue if fetch fails
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Request Blood</h1>
        <p className="text-muted-foreground mt-2">
          Create a new blood request to find donors near the patient's hospital.
          Create a new blood request to find donors near the patient&apos;s hospital.
        </p>
      </div>

      <RequestForm />
      <RequestForm initialPhone={user?.phone || ""} />
    </div>
  );
}
