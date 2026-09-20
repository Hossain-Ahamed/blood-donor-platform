import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { apiServer } from "@/lib/api/server";
import { HistoryClient } from "./HistoryClient";
import type { BloodRequestItem } from "./HistoryRequestCard";
import type { AppliedResponseItem } from "./HistoryApplicationCard";
import type { DonationItem } from "./HistoryDonationCard";

async function confirmDonationAction(formData: FormData) {
  "use server";
  const donationId = formData.get("donationId") as string;
  const responseId = formData.get("responseId") as string;
  if (!donationId && !responseId) return;
  try {
    const url = responseId
      ? `/donations/response/${responseId}/confirm`
      : `/donations/${donationId}/confirm`;
    await apiServer.request(url, {
      method: "PATCH",
      body: JSON.stringify({ confirmed: true }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    revalidatePath("/history");
  } catch (err) {
    console.error("Failed to confirm donation:", err);
  }
}

export default async function HistoryPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    redirect("/login?redirect=/history");
  }

  let requests: BloodRequestItem[] = [];
  let donations: DonationItem[] = [];
  let appliedResponses: AppliedResponseItem[] = [];
  let shouldRedirectToLogin = false;

  try {
    const [reqRes, donRes, respRes] = await Promise.allSettled([
      apiServer.request<{ data: BloodRequestItem[] } | BloodRequestItem[]>("/requests/me"),
      apiServer.request<{ data: DonationItem[] } | DonationItem[]>("/donations/me"),
      apiServer.request<{ data: AppliedResponseItem[] } | AppliedResponseItem[]>("/responses/me"),
    ]);

    if (
      (reqRes.status === "rejected" &&
        ((reqRes.reason as any)?.status === 401 ||
          (reqRes.reason as any)?.statusCode === 401)) ||
      (donRes.status === "rejected" &&
        ((donRes.reason as any)?.status === 401 ||
          (donRes.reason as any)?.statusCode === 401)) ||
      (respRes.status === "rejected" &&
        ((respRes.reason as any)?.status === 401 ||
          (respRes.reason as any)?.statusCode === 401))
    ) {
      shouldRedirectToLogin = true;
    }

    if (reqRes.status === "fulfilled") {
      const val = reqRes.value;
      requests = Array.isArray(val) ? val : val?.data || [];
    }
    if (donRes.status === "fulfilled") {
      const val = donRes.value;
      donations = Array.isArray(val) ? val : val?.data || [];
    }
    if (respRes.status === "fulfilled") {
      const val = respRes.value;
      appliedResponses = Array.isArray(val) ? val : val?.data || [];
    }
  } catch (e) {
    console.error(e);
  }

  if (shouldRedirectToLogin) {
    redirect("/login?redirect=/history");
  }

  return (
    <HistoryClient
      requests={requests}
      donations={donations}
      appliedResponses={appliedResponses}
      confirmDonationAction={confirmDonationAction}
    />
  );
}
