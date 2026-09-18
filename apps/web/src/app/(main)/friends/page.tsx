import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiServer } from "@/lib/api/server";
import { FriendsClient } from "./FriendsClient";
import { FriendUser } from "@repo/shared";

export const metadata = {
  title: "My Blood Donor Friends | Blood Donor Platform",
  description:
    "Connect with friends and fellow blood donors. Receive urgent alerts when your friends need blood.",
};

export default async function FriendsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login?redirect=/friends");
  }

  let initialFriends: FriendUser[] = [];
  let initialRequests = { received: [] as FriendUser[], sent: [] as FriendUser[] };
  let shouldRedirectToLogin = false;

  try {
    const [friendsRes, requestsRes] = await Promise.allSettled([
      apiServer.request<FriendUser[]>("/friends"),
      apiServer.request<{ received: FriendUser[]; sent: FriendUser[] }>(
        "/friends/requests",
      ),
    ]);

    if (
      friendsRes.status === "rejected" &&
      ((friendsRes.reason as any)?.status === 401 ||
        (friendsRes.reason as any)?.statusCode === 401)
    ) {
      shouldRedirectToLogin = true;
    }

    if (friendsRes.status === "fulfilled" && Array.isArray(friendsRes.value)) {
      initialFriends = friendsRes.value;
    }

    if (
      requestsRes.status === "fulfilled" &&
      requestsRes.value &&
      Array.isArray(requestsRes.value.received)
    ) {
      initialRequests = requestsRes.value;
    }
  } catch (err) {
    console.error("Failed to load initial friends data:", err);
  }

  if (shouldRedirectToLogin) {
    redirect("/login?redirect=/friends");
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 sm:py-8 px-4">
      <FriendsClient
        initialFriends={initialFriends}
        initialRequests={initialRequests}
      />
    </div>
  );
}
