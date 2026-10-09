"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, CheckCircle2, AlertCircle, Share } from "lucide-react";

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
  const isIos =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

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
          isIos ? (
            <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                iPhone / iPad Setup Required
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Apple restricts Web Push inside Chrome on iOS. To receive emergency alerts on your iPhone:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-foreground font-medium pl-0.5">
                <li>Open this site in <strong>Safari</strong></li>
                <li>Tap the <strong>Share</strong> button <Share className="inline w-3 h-3 text-muted-foreground mx-0.5" /></li>
                <li>Tap <strong>&quot;Add to Home Screen&quot;</strong></li>
                <li>Launch the app from your Home Screen &amp; enable alerts</li>
              </ol>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Web push notifications are not supported in this browser.
            </p>
          )
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
