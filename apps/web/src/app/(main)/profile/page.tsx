import { apiServer } from "@/lib/api/server";
import { ProfileForm } from "./ProfileForm";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge } from "@/components/ui/badge";
import type { DonorProfile, User } from "@repo/shared";

type ProfileWithUser = DonorProfile & { user?: User };

export default async function ProfilePage() {
  let profile: ProfileWithUser | null = null;
  let user: User | null = null;

  try {
    const [profileRes, userRes] = await Promise.allSettled([
      apiServer.request<{ data: ProfileWithUser } | ProfileWithUser>(
        "/donor-profiles/me",
      ),
      apiServer.request<{ data: User } | User>("/users/me"),
    ]);

    if (profileRes.status === "fulfilled") {
      const val = profileRes.value;
      profile = "data" in val && val.data ? val.data : (val as ProfileWithUser);
    }
    if (userRes.status === "fulfilled") {
      const val = userRes.value;
      user = "data" in val && val.data ? val.data : (val as User);
    }
  } catch (error) {
    console.error("Error loading profile data", error);
  }

  const isAvailable = profile?.is_available;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Donor Profile</h1>
          <p className="text-muted-foreground">
            Manage your donor information and availability.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {profile && (
            <Badge
              variant="outline"
              className={
                isAvailable
                  ? "text-green-600 border-green-600"
                  : "text-amber-600 border-amber-600"
              }
            >
              Status: {isAvailable ? "Available" : "Unavailable"}
            </Badge>
          )}
          <LanguageSwitcher />
        </div>
      </div>

      <ProfileForm initialData={profile} initialUser={user} />
    </div>
  );
}
