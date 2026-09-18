"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  MapPin,
  CheckCheck,
  UserCheck,
  AlertCircle,
  UserPlus,
  HeartHandshake,
  Heart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { SmartAlertItem, SmartFeedResponse } from "@repo/shared";

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getAlertIcon(type: string, urgency: string) {
  switch (type) {
    case "NEARBY_REQUEST":
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
          <MapPin className="w-4 h-4" />
        </div>
      );
    case "OFFER_ACCEPTED":
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    case "OFFER_RECEIVED":
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
          <UserCheck className="w-4 h-4" />
        </div>
      );
    case "DONATION_REMINDER":
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
          <Calendar className="w-4 h-4" />
        </div>
      );
    case "FRIEND_REQUEST":
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
          <UserPlus className="w-4 h-4" />
        </div>
      );
    case "FRIEND_ACCEPTED":
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
          <HeartHandshake className="w-4 h-4" />
        </div>
      );
    case "FRIEND_BLOOD_REQUEST":
      return (
        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400 animate-pulse">
          <Heart className="w-4 h-4 fill-current" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-600 dark:text-zinc-300">
          <Bell className="w-4 h-4" />
        </div>
      );
  }
}

export function SmartAlertBell() {
  const [feed, setFeed] = useState<SmartFeedResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await apiClient.request<SmartFeedResponse>("/smart-feed");
      if (res && Array.isArray(res.alerts)) {
        setFeed(res);
      }
    } catch {
      // User may not be authenticated yet or offline
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    // Lightweight polling every 45 seconds
    const interval = setInterval(fetchFeed, 45000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const markSeen = async (alertId: string) => {
    // Optimistic UI update
    setFeed((prev) => {
      if (!prev) return prev;
      const alerts = prev.alerts.map((a) =>
        a.id === alertId ? { ...a, is_read: true } : a,
      );
      const unreadCount = alerts.filter((a) => !a.is_read).length;
      return { ...prev, alerts, unreadCount };
    });

    try {
      await apiClient.request("/smart-feed/read", {
        method: "POST",
        body: JSON.stringify({ alertId }),
      });
    } catch {
      // ignore
    }
  };

  const markAllSeen = async () => {
    if (!feed || feed.alerts.length === 0) return;
    const alertIds = feed.alerts.map((a) => a.id);

    // Optimistic UI update
    setFeed((prev) => {
      if (!prev) return prev;
      const alerts = prev.alerts.map((a) => ({ ...a, is_read: true }));
      return { ...prev, alerts, unreadCount: 0 };
    });

    try {
      await apiClient.request("/smart-feed/read-all", {
        method: "POST",
        body: JSON.stringify({ alertIds }),
      });
    } catch {
      // ignore
    }
  };

  const unreadCount = feed?.unreadCount || 0;
  const alerts = feed?.alerts || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        aria-label="View live alerts"
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors outline-none cursor-pointer"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-xl rounded-2xl border overflow-hidden backdrop-blur-md bg-card/95"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-600 dark:text-red-500" />
            <span className="font-bold text-sm text-foreground">Live Alerts</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5 font-bold">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllSeen}
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark seen</span>
            </Button>
          )}
        </div>

        {/* Location profile reminder if incomplete */}
        {feed && !feed.hasProfileLocation && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/50 dark:border-amber-900/50 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Set location to get nearby alerts
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Save your blood group & location to receive real-time alerts when someone needs blood near you.
              </p>
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="inline-block text-[11px] font-bold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:opacity-80"
              >
                Complete Profile &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="max-h-84 overflow-y-auto divide-y divide-border/60">
          {alerts.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60">
                <Bell className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-foreground">All Quiet</p>
              <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto">
                No active urgent blood requests or donation alerts in your area right now.
              </p>
            </div>
          ) : (
            alerts.map((item) => {
              const content = (
                <div
                  className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer w-full text-left relative ${
                    !item.is_read
                      ? "bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/70 dark:hover:bg-red-950/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {getAlertIcon(item.type, item.urgency)}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs leading-tight line-clamp-1 ${!item.is_read ? "font-bold text-foreground" : "font-medium text-foreground/85"}`}>
                        {item.title}
                      </p>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 pt-0.5">
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{timeAgo(item.timestamp)}</span>
                      </div>
                      {item.distance_km !== undefined && (
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          &bull; {item.distance_km} km away
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 self-center" />
                </div>
              );

              return (
                <div key={item.id}>
                  <Link
                    href={item.link}
                    onClick={() => {
                      markSeen(item.id);
                      setIsOpen(false);
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
