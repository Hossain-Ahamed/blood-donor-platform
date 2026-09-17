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
import { RequestForm } from "../RequestForm";

type ProfileWithUser = DonorProfile & { user?: User };

export default async function NewRequestPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) {
    redirect("/login?redirect=/requests/new");
  }

  let profile: ProfileWithUser | null = null;
  let user: User | null = null;
  try {
    const [profileRes, userRes] = await Promise.allSettled([
      apiServer.request<{ data: ProfileWithUser } | ProfileWithUser>(
        "/donor-profiles/me",
      ),
      apiServer.request<{ data: User } | User>("/users/me"),
    ]);
    if (profileRes.status === "fulfilled" && profileRes.value) {
      const val = profileRes.value;
      profile =
        "data" in val && val.data ? val.data : (val as ProfileWithUser);
    }
    if (userRes.status === "fulfilled" && userRes.value) {
      const val = userRes.value;
      user = "data" in val && val.data ? val.data : (val as User);
    }
  } catch (error) {
    console.error("Error checking donor profile for new request page:", error);
  }

  const isProfileComplete = Boolean(profile && profile.blood_group);
  const userPhone = user?.phone?.trim() || profile?.user?.phone?.trim();
  const hasPhone = Boolean(userPhone);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Request Blood</h1>
        <p className="text-muted-foreground mt-2">
          Create a new blood request to find donors near the patient&apos;s hospital.
        </p>
      </div>

      {!isProfileComplete ? (
        <Card className="max-w-xl mx-auto shadow-sm">
          <CardHeader>
            <CardTitle>Need Blood?</CardTitle>
            <CardDescription>
              Create a new blood request to find donors near the patient&apos;s hospital.
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
              <Link href="/profile?redirect=/requests/new">
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
      ) : !hasPhone ? (
        <Card className="max-w-xl mx-auto shadow-sm border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-300">
              Contact Number Required
            </CardTitle>
            <CardDescription>
              You must provide a contact phone number to create a blood request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Potential donors need your contact phone number to reach you
                immediately and coordinate the donation.
              </p>
              <Link href="/profile?redirect=/requests/new">
                <Button
                  size="lg"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Add Contact Number in Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <RequestForm initialPhone={userPhone} />
      )}
    </div>
  );
}

