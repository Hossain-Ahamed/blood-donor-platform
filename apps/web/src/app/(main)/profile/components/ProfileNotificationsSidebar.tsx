"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProfileNotificationsSidebarProps {
  isSupported: boolean;
  pushLoading: boolean;
  isSubscribed: boolean;
  onSubscribe: () => void;
}

export function ProfileNotificationsSidebar({
  isSupported,
  pushLoading,
  isSubscribed,
  onSubscribe,
}: ProfileNotificationsSidebarProps) {
  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Get alerted immediately when someone needs your blood group nearby.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSupported ? (
          <p className="text-sm text-muted-foreground">
            Push notifications not supported in this browser.
          </p>
        ) : pushLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking push status...
          </div>
        ) : isSubscribed ? (
          <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Notifications Active
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enable push notifications to receive urgent blood donation requests.
            </p>
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900"
              onClick={onSubscribe}
            >
              Enable Notifications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
