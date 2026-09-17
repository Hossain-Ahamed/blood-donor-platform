"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Heart,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  created_at: string;
}

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

function getNotificationIcon(type: string) {
  switch (type) {
    case "DONOR_APPLIED":
      return <HeartHandshake className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />;
    case "OFFER_ACCEPTED":
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
    case "OFFER_DECLINED":
      return <XCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
    case "DONATION_CONFIRMED":
      return <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0 mt-0.5" />;
    default:
      return <Bell className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />;
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiClient.request<NotificationItem[]>("/notifications");
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch {
      // User may not be logged in yet or offline
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const count = notifications.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        aria-label="View notifications"
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors outline-none cursor-pointer"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-lg rounded-xl border"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-600" />
            <span className="font-bold text-sm text-foreground">Notifications</span>
          </div>
          {count > 0 && (
            <Badge variant="secondary" className="text-xs font-semibold">
              {count}
            </Badge>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Bell className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-xs font-medium text-foreground">No notifications yet</p>
              <p className="text-[11px] text-muted-foreground">
                When donors apply to your requests, alerts will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const content = (
                <div className="flex items-start gap-3 p-3.5 hover:bg-muted/50 transition-colors cursor-pointer w-full text-left">
                  {getNotificationIcon(item.type)}
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 pt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{timeAgo(item.created_at)}</span>
                    </div>
                  </div>
                  {item.link && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 self-center" />
                  )}
                </div>
              );

              return (
                <div key={item.id}>
                  {item.link ? (
                    <Link
                      href={item.link}
                      onClick={() => setIsOpen(false)}
                      className="block"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
