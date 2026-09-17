"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RequestEditDialog } from "@/components/RequestEditDialog";
import { apiClient, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Edit3,
  Trash2,
  Loader2,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { RequestStatus } from "@repo/shared";
import { requestStatusLabels, getLabel } from "@/lib/labels";

interface RequestManagementCardProps {
  request: {
    id: string;
    blood_group: string;
    component_type?: string | null;
    units_needed: number;
    units_fulfilled: number;
    urgency?: string | null;
    status: string;
    area_name: string;
    hospital_name?: string | null;
    patient_name?: string | null;
    patient_age?: number | null;
    disease?: string | null;
    needed_time?: string | Date | null;
    contact_phone?: string | null;
    patient_note?: string | null;
    location?: { type?: string; coordinates?: [number, number] } | null;
  };
  isOwnRequest: boolean;
  isAdmin: boolean;
}

export function RequestManagementCard({
  request: initialRequest,
  isOwnRequest,
  isAdmin,
}: RequestManagementCardProps) {
  const router = useRouter();
  const [request, setRequest] = useState(initialRequest);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateStatus = async (newStatus: RequestStatus) => {
    setIsStatusUpdating(true);
    try {
      const endpoint = isAdmin
        ? `/admin/requests/${request.id}`
        : `/requests/${request.id}`;

      const res = await apiClient.request<
        | {
            data?: Partial<typeof request>;
          }
        | Partial<typeof request>
      >(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      const updated = res && "data" in res ? res.data : res;
      setRequest((prev) => ({
        ...prev,
        status: newStatus,
        ...(updated || {}),
      }));

      const label = getLabel(requestStatusLabels, newStatus);
      toast.success(`Request marked as ${label}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to update status:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to update status");
      } else {
        toast.error("Failed to update status. Please try again.");
      }
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDeleteRequest = async () => {
    setIsDeleting(true);
    try {
      const endpoint = isAdmin
        ? `/admin/requests/${request.id}`
        : `/requests/${request.id}`;

      await apiClient.request<Record<string, unknown>>(endpoint, {
        method: "DELETE",
      });

      toast.success("Blood request deleted successfully");
      setIsDeleteDialogOpen(false);

      if (isOwnRequest) {
        router.push("/history");
      } else {
        router.push("/admin/requests");
      }
    } catch (err) {
      console.error("Failed to delete request:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to delete request");
      } else {
        toast.error("Failed to delete request. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isFulfilled = request.status === "FULFILLED";
  const isCancelled = request.status === "CANCELLED";
  const isOpen = request.status === "OPEN";

  return (
    <>
      <Card className="border-red-200 dark:border-red-950/60 shadow-sm bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              {isAdmin && !isOwnRequest ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  Admin Request Controls
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5 text-red-600" />
                  Manage Your Request
                </>
              )}
            </CardTitle>
            <Badge
              variant={
                isOpen
                  ? "default"
                  : isFulfilled
                    ? "secondary"
                    : isCancelled
                      ? "destructive"
                      : "outline"
              }
              className="text-xs font-semibold uppercase"
            >
              {getLabel(requestStatusLabels, request.status)}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {isOwnRequest
              ? "You created this request. You can update details, change status, or delete it."
              : "Administrator privileges enabled for this blood request."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          {/* Status guidance message */}
          {isOpen && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-semibold">Request is currently Open</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Donors nearby can view this request. Once blood has been
                  collected or donors found, mark it completed. If donors are no
                  longer needed, mark it as cancelled.
                </p>
              </div>
            </div>
          )}

          {isFulfilled && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <p className="font-semibold">Marked as Completed / Fulfilled</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                  This request was completed. If you still need more blood bags,
                  you can reopen this request or edit the units needed.
                </p>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Marked as No Longer Needed</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  This request was cancelled. You can reopen it at any time if
                  blood is needed again.
                </p>
              </div>
            </div>
          )}

          {/* Quick Status Action Buttons */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Status Actions
            </span>
            <div className="flex flex-col gap-2">
              {isOpen ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(RequestStatus.FULFILLED)}
                    disabled={isStatusUpdating}
                    className="w-full justify-center text-xs h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50 font-semibold shadow-sm"
                  >
                    {isStatusUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                    )}
                    <span>Mark Completed</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(RequestStatus.CANCELLED)}
                    disabled={isStatusUpdating}
                    className="w-full justify-center text-xs h-9 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/50 font-semibold shadow-sm"
                  >
                    {isStatusUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
                    )}
                    <span>No Longer Needed</span>
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus(RequestStatus.OPEN)}
                  disabled={isStatusUpdating}
                  className="w-full justify-center text-xs h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50 font-semibold shadow-sm"
                >
                  {isStatusUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                  )}
                  <span>Re-open Blood Request</span>
                </Button>
              )}
            </div>
          </div>

          {/* Edit & Delete Action Buttons */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Manage Details
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="w-full justify-center text-xs font-semibold h-9 border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
                <span>Modify Details</span>
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full justify-center text-xs font-semibold h-9 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span>Delete</span>
              </Button>
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-2 pt-2 border-t">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Admin Control
              </span>
              <Link
                href={`/admin/requests?requestId=${request.id}`}
                className="block w-full"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs font-semibold h-9 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50 shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-red-600 shrink-0" />
                  <span>Show full detail</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Request Dialog */}
      <RequestEditDialog
        request={request}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        isAdmin={isAdmin}
        onSuccess={(updated) => {
          setRequest((prev) => ({
            ...prev,
            ...(updated || {}),
          }));
          router.refresh();
        }}
      />

      {/* Confirm Delete Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Delete Blood Request?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete this blood request? It will be
              removed from donor searches and public listings.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteRequest}
              disabled={isDeleting}
              className="font-semibold"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Yes, Delete Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
