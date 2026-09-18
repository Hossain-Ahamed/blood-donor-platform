"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@repo/shared";
import { useAuth } from "@/hooks/useAuth";

interface AdminUserActionDialogProps {
  dialogAction: "block" | "unblock" | "role" | null;
  selectedUser: User | null;
  newRole: UserRole | null;
  actionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AdminUserActionDialog({
  dialogAction,
  selectedUser,
  newRole,
  actionLoading,
  onClose,
  onConfirm,
}: AdminUserActionDialogProps) {
  const { user: currentUser } = useAuth();
  const isSelf = Boolean(currentUser && selectedUser && currentUser.id === selectedUser.id);
  const isInvalidSelfAction = isSelf && (dialogAction === "block" || (dialogAction === "role" && newRole !== UserRole.ADMIN));

  return (
    <Dialog open={!!dialogAction} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialogAction === "block" && "Block User"}
            {dialogAction === "unblock" && "Unblock User"}
            {dialogAction === "role" && "Change User Role"}
          </DialogTitle>
          <DialogDescription>
            {isInvalidSelfAction ? (
              <span className="text-red-600 dark:text-red-400 font-semibold block pt-1">
                You cannot block your own administrator account or demote yourself.
              </span>
            ) : (
              <>
                {dialogAction === "block" &&
                  `Are you sure you want to block ${selectedUser?.name}? They will not be able to log in.`}
                {dialogAction === "unblock" &&
                  `Are you sure you want to unblock ${selectedUser?.name}? They will regain access to the platform.`}
                {dialogAction === "role" &&
                  `Are you sure you want to change ${selectedUser?.name}'s role to ${newRole}?`}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant={dialogAction === "block" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={actionLoading || isInvalidSelfAction}
          >
            {actionLoading ? "Updating..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
