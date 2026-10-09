"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileNotificationsSidebarProps {
  isSupported: boolean;
  pushLoading: boolean;
  isSubscribed: boolean;
  testLoading?: boolean;
  permissionState?: NotificationPermission;
  onSubscribe: () => void;
  onUnsubscribe?: () => void;
  onSendTest?: () => void;
}

export function ProfileNotificationsSidebar({
  isSupported,
  pushLoading,
  isSubscribed,
  testLoading = false,
  permissionState = "default",
  onSubscribe,
  onUnsubscribe,
  onSendTest,
}: ProfileNotificationsSidebarProps) {
  const isDenied = permissionState === "denied";

  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-600" /> Notifications
        </CardTitle>
        <CardDescription className="text-xs">
          Receive real-time alerts when someone needs your blood group nearby.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSupported ? (
          <p className="text-xs text-muted-foreground">
            Web push notifications are not supported in this browser.
          </p>
        ) : pushLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking notification status...
          </div>
        ) : isDenied ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-amber-600 dark:text-amber-500 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Notifications are blocked by your browser settings.
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              To enable alerts, click the lock/settings icon next to your URL bar and toggle Notifications to &quot;Allow&quot;.
            </p>
          </div>
        ) : isSubscribed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Notifications Active
            </div>
            <p className="text-[11px] text-muted-foreground">
              Device registered to receive emergency alerts for your blood group within 10 km.
            </p>
            {onSendTest && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 border-dashed"
                onClick={onSendTest}
                disabled={testLoading}
              >
                {testLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Bell className="w-3.5 h-3.5 mr-1.5 text-red-600" />
                )}
                Send Test Alert
              </Button>
            )}
            {onUnsubscribe && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-[11px] h-7 text-muted-foreground hover:text-red-600"
                onClick={onUnsubscribe}
                disabled={pushLoading || testLoading}
              >
                Reset / Turn Off
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Turn on push alerts to get notified instantly when patients near you need blood.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 text-xs font-semibold"
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
