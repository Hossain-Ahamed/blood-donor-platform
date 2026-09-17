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
  ExternalLink,
} from "lucide-react";
import { RequestStatus } from "@repo/shared";
import { requestStatusLabels, getLabel } from "@/lib/labels";
import { RequestDeleteModal } from "./RequestDeleteModal";

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
        | { data?: Partial<typeof request> }
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

  return (
    <>
      <Card className="border-red-200 dark:border-red-950/60 shadow-sm bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              {isAdmin && !isOwnRequest ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  Admin Controls
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
                request.status === "OPEN"
                  ? "default"
                  : request.status === "FULFILLED"
                    ? "secondary"
                    : request.status === "CANCELLED"
                      ? "destructive"
                      : "outline"
              }
              className="text-xs"
            >
              {getLabel(requestStatusLabels, request.status)}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Update status, edit patient information, or manage visibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 font-semibold text-xs h-9 border-zinc-300 dark:border-zinc-700"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit3 className="w-4 h-4 text-blue-600" />
            Edit Request Details
          </Button>

          <div className="pt-1 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Quick Status Actions:
            </p>

            {request.status !== "FULFILLED" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center gap-1.5 text-xs h-8"
                onClick={() => handleUpdateStatus(RequestStatus.FULFILLED)}
                disabled={isStatusUpdating}
              >
                {isStatusUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Mark as Fulfilled (Received)
              </Button>
            )}

            {request.status !== "OPEN" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center gap-1.5 text-xs h-8"
                onClick={() => handleUpdateStatus(RequestStatus.OPEN)}
                disabled={isStatusUpdating}
              >
                {isStatusUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Reopen Request
              </Button>
            )}

            {request.status !== "CANCELLED" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 flex items-center justify-center gap-1.5 text-xs h-8"
                onClick={() => handleUpdateStatus(RequestStatus.CANCELLED)}
                disabled={isStatusUpdating}
              >
                {isStatusUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Cancel Request
              </Button>
            )}
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
            {isAdmin && (
              <Link href="/admin/requests" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Admin Dashboard
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto h-8 px-2.5 flex items-center gap-1"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Request
            </Button>
          </div>
        </CardContent>
      </Card>

      <RequestEditDialog
        request={request}
        isOpen={isEditDialogOpen}
        isAdmin={isAdmin}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={(updated) => {
          setRequest((prev) => ({
            ...prev,
            ...((updated as Partial<typeof request>) || {}),
          }));
          router.refresh();
        }}
      />

      <RequestDeleteModal
        isOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        isAdmin={isAdmin}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteRequest}
      />
    </>
  );
}
