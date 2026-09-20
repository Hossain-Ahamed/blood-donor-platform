"use client";

import { useState, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  UserX,
  Loader2,
  HeartHandshake,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { FriendshipRelationStatus } from "@repo/shared";
import { cn } from "@/lib/utils";

interface FriendActionButtonProps {
  targetUserId: string;
  targetUserName?: string;
  initialStatus?: FriendshipRelationStatus;
  initialFriendshipId?: string;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  simple?: boolean;
  onStatusChange?: (newStatus: FriendshipRelationStatus) => void;
}

export function FriendActionButton({
  targetUserId,
  targetUserName,
  initialStatus,
  initialFriendshipId,
  size = "sm",
  className,
  simple = false,
  onStatusChange,
}: FriendActionButtonProps) {
  const [status, setStatus] = useState<FriendshipRelationStatus | null>(
    initialStatus || null,
  );
  const [friendshipId, setFriendshipId] = useState<string | undefined>(
    initialFriendshipId,
  );
  const [isSelf, setIsSelf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isConfirmingUnfriend, setIsConfirmingUnfriend] = useState(false);

  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
      setFriendshipId(initialFriendshipId);
      return;
    }

    let isMounted = true;
    apiClient
      .request<{
        relationship: FriendshipRelationStatus;
        friendship_id?: string;
        is_self: boolean;
      }>(`/friends/status/${targetUserId}`)
      .then((res) => {
        if (isMounted && res) {
          setStatus(res.relationship);
          setFriendshipId(res.friendship_id);
          setIsSelf(Boolean(res.is_self));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [targetUserId, initialStatus, initialFriendshipId]);

  if (isSelf) return null;

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<any>("/friends/request", {
        method: "POST",
        body: JSON.stringify({ addressee_id: targetUserId }),
      });
      const newStatus =
        res?.status === "ACCEPTED" ? "FRIENDS" : "PENDING_SENT";
      setStatus(newStatus);
      if (res?.id) setFriendshipId(res.id);
      onStatusChange?.(newStatus);
      toast.success(
        newStatus === "FRIENDS"
          ? "You are now friends! 🎉"
          : "Friend request sent!",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendshipId) return;
    setLoading(true);
    try {
      await apiClient.request(`/friends/request/${friendshipId}/accept`, {
        method: "POST",
      });
      setStatus("FRIENDS");
      onStatusChange?.("FRIENDS");
      toast.success("Friend request accepted! 🎉");
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept request");
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!friendshipId) return;
    setLoading(true);
    try {
      await apiClient.request(`/friends/request/${friendshipId}/decline`, {
        method: "POST",
      });
      setStatus("NONE");
      setFriendshipId(undefined);
      onStatusChange?.("NONE");
      toast.info("Friend request declined");
    } catch (err: any) {
      toast.error(err?.message || "Failed to decline request");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!friendshipId) return;
    setLoading(true);
    try {
      await apiClient.request(`/friends/request/${friendshipId}/cancel`, {
        method: "DELETE",
      });
      setStatus("NONE");
      setFriendshipId(undefined);
      onStatusChange?.("NONE");
      toast.info("Friend request cancelled");
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel request");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfriend = async () => {
    setLoading(true);
    try {
      await apiClient.request(`/friends/${targetUserId}`, {
        method: "DELETE",
      });
      setStatus("NONE");
      setFriendshipId(undefined);
      onStatusChange?.("NONE");
      toast.info("Removed from friends");
    } catch (err: any) {
      toast.error(err?.message || "Failed to unfriend");
    } finally {
      setLoading(false);
      setIsConfirmingUnfriend(false);
    }
  };

  if (status === "FRIENDS") {
    if (simple) {
      return (
        <>
          <Button
            variant="outline"
            size={size as any}
            className={cn(
              "h-8 px-3 text-xs font-medium border-muted-foreground/20 text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 transition-colors cursor-pointer shrink-0 rounded-lg",
              className,
            )}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsConfirmingUnfriend(true);
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserX className="w-3.5 h-3.5" />
            )}
            <span>Unfriend</span>
          </Button>

          <Dialog
            open={isConfirmingUnfriend}
            onOpenChange={setIsConfirmingUnfriend}
          >
            <DialogContent
              className="sm:max-w-xs p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base font-bold">
                  {targetUserName ? `Unfriend ${targetUserName}?` : "Unfriend user?"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Are you sure you want to remove this friend?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingUnfriend(false)}
                  disabled={loading}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUnfriend}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : null}
                  Unfriend
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: size as any }),
              "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 gap-1.5 font-medium shadow-none cursor-pointer",
              className,
            )}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Friends</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400 cursor-pointer flex items-center gap-2"
              onClick={() => setIsConfirmingUnfriend(true)}
            >
              <UserX className="w-4 h-4" />
              <span>Unfriend</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog
          open={isConfirmingUnfriend}
          onOpenChange={setIsConfirmingUnfriend}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unfriend user?</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this friendship? This action is
                bidirectional and you will no longer receive special friend blood
                request notifications from each other.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsConfirmingUnfriend(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUnfriend}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : null}
                Unfriend
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (status === "PENDING_SENT") {
    if (simple) {
      return (
        <Button
          variant="outline"
          size={size as any}
          className={cn(
            "h-8 px-3 text-xs font-medium border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 transition-colors cursor-pointer shrink-0 rounded-lg",
            className,
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleCancelRequest();
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          )}
          <span>Requested</span>
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "outline", size: size as any }),
            "border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 gap-1.5 font-medium shadow-none cursor-pointer",
            className,
          )}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          )}
          <span>Requested</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive cursor-pointer flex items-center gap-2"
            onClick={handleCancelRequest}
          >
            <X className="w-4 h-4" />
            <span>Cancel Request</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (status === "PENDING_RECEIVED") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size={size}
          className={cn(
            "bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm font-medium",
            className,
          )}
          onClick={handleAcceptRequest}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>Accept</span>
        </Button>
        <Button
          variant="outline"
          size={size}
          className="text-muted-foreground hover:text-foreground px-2"
          onClick={handleDeclineRequest}
          disabled={loading}
          title="Decline Request"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  // Default state: NONE (Add Friend)
  return (
    <Button
      variant="outline"
      size={size}
      className={cn(
        "border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5 font-medium shadow-sm transition-all",
        className,
      )}
      onClick={handleSendRequest}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <UserPlus className="w-3.5 h-3.5" />
      )}
      <span>Add Friend</span>
    </Button>
  );
}
