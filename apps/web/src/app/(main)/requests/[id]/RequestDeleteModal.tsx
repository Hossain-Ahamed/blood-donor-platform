"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

interface RequestDeleteModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RequestDeleteModal({
  isOpen,
  isDeleting,
  isAdmin,
  onClose,
  onConfirm,
}: RequestDeleteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold">
            Delete Blood Request?
          </DialogTitle>
          <DialogDescription className="text-xs">
            Are you sure you want to delete this blood request? This action cannot
            be undone. All volunteer donor responses and notifications associated
            with this request will be removed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2 flex flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Keep Request
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="font-semibold"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1.5" />
            )}
            {isAdmin ? "Admin Delete" : "Delete Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
