import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiServer } from "@/lib/api/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DonorProfile, User } from "@repo/shared";
import { RequestForm } from "./RequestForm";

type ProfileWithUser = DonorProfile & { user?: User };

export default async function RequestCreatePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    redirect("/login?redirect=/requests");
  }

  let profile: ProfileWithUser | null = null;
  let shouldRedirectToLogin = false;
  try {
    const profileRes = await apiServer.request<
      { data: ProfileWithUser } | ProfileWithUser
    >("/donor-profiles/me");
    if (profileRes) {
      profile =
        "data" in profileRes && profileRes.data
          ? profileRes.data
          : (profileRes as ProfileWithUser);
    }
  } catch (error: any) {
    if (error?.status === 401 || error?.statusCode === 401) {
      shouldRedirectToLogin = true;
    } else {
      console.error("Error checking donor profile for request page:", error);
    }
  }

  if (shouldRedirectToLogin) {
    redirect("/login?redirect=/requests");
  }

  const isProfileComplete = Boolean(profile && profile.blood_group);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Request Blood</h1>
        <p className="text-muted-foreground mt-2">
          Create a new blood request to find donors near your hospital.
        </p>
      </div>

      {!isProfileComplete ? (
        <Card className="max-w-xl mx-auto shadow-sm">
          <CardHeader>
            <CardTitle>Need Blood?</CardTitle>
            <CardDescription>
              Create a new blood request to find donors near your hospital.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium text-center">
                Profile Information Required
              </p>
              <p className="text-xs text-muted-foreground text-center">
                You need to complete your donor profile (with your blood group
                and location) before requesting.
              </p>
              <Link href="/profile?redirect=/requests">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                >
                  Complete Profile to Request
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <RequestForm />
      )}
    </div>
  );
}

