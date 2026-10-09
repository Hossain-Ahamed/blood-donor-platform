import { useState, useEffect, useSyncExternalStore } from "react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function checkIsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function getPermission(): NotificationPermission {
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission;
  }
  return "default";
}

export function usePushNotifications() {
  const isSupported = useSyncExternalStore(
    () => () => {},
    checkIsSupported,
    () => false,
  );

  const permissionState = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || !("permissions" in navigator)) {
        return () => {};
      }
      let cancelled = false;
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((status) => {
          if (!cancelled) {
            status.onchange = onStoreChange;
          }
        })
        .catch(() => {});

      return () => {
        cancelled = true;
      };
    },
    getPermission,
    () => "default" as NotificationPermission,
  );

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const loading = isSupported && (initializing || isSubscribing);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    let isMounted = true;

    async function initPush() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const sub = await registration.pushManager.getSubscription();

        if (isMounted) {
          setIsSubscribed(Boolean(sub));
        }

        // Auto-sync browser subscription to backend for currently logged-in user
        if (sub) {
          apiClient
            .request("/push-subscriptions", {
              method: "POST",
              body: JSON.stringify(sub),
            })
            .catch((e: unknown) => {
              console.warn("Background push subscription sync:", e);
            });
        }
      } catch (err: unknown) {
        console.error("Service Worker registration failed:", err);
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    }

    initPush();

    return () => {
      isMounted = false;
    };
  }, [isSupported]);

  const subscribeToPush = async () => {
    try {
      setIsSubscribing(true);

      if (permissionState === "denied") {
        toast.error(
          "Notifications are blocked by your browser. Please click the lock icon in your address bar to allow notifications.",
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID public key not found in environment configuration");
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setIsSubscribed(true);

      // Send to backend
      await apiClient.request("/push-subscriptions", {
        method: "POST",
        body: JSON.stringify(sub),
      });

      toast.success("Push notifications enabled successfully!");
    } catch (err: unknown) {
      console.error("Failed to subscribe to push notifications:", err);
      const message = err instanceof Error ? err.message : String(err);
      const isNotAllowed =
        (err instanceof Error && err.name === "NotAllowedError") ||
        message.includes("permission denied");

      if (isNotAllowed) {
        toast.error("Notification permission was denied. Please allow notifications in your browser.");
      } else {
        toast.error(message || "Failed to subscribe to push notifications");
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      setIsSubscribing(true);
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await apiClient
          .request("/push-subscriptions", {
            method: "DELETE",
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          .catch(() => {});
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success("Notifications reset. You can now re-enable them to generate a fresh token.");
    } catch (err: unknown) {
      console.error("Failed to unsubscribe from push notifications:", err);
      toast.error("Failed to reset notification subscription.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setTestLoading(true);
      const res = await apiClient.request<{ success?: boolean; message?: string }>(
        "/push-subscriptions/test",
        {
          method: "POST",
        },
      );
      toast.success(res?.message || "Test alert dispatched! Check your desktop/mobile notifications.");
    } catch (err: unknown) {
      console.error("Failed to dispatch test notification:", err);
      const message = err instanceof Error ? err.message : "Failed to send test notification";
      if (message.includes("expired") || message.includes("invalidated")) {
        setIsSubscribed(false);
      }
      toast.error(message);
    } finally {
      setTestLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    loading,
    testLoading,
    permissionState,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
  };
}
