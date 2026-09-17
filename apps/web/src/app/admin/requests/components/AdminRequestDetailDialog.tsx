"use client";

import Link from "next/link";
import { toast } from "sonner";
import { RequestStatus } from "@repo/shared";
import {
  bloodGroupLabels,
  urgencyLabels,
  requestStatusLabels,
  componentTypeLabels,
  getLabel,
} from "@/lib/labels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Copy,
  User as UserIcon,
  Phone,
  Clock,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  Check,
  XCircle,
} from "lucide-react";
import type { RequestWithRequester } from "./types";

interface AdminRequestDetailDialogProps {
  isOpen: boolean;
  request: RequestWithRequester | null;
  actionLoading: boolean;
  onClose: () => void;
  onOpenEdit: () => void;
  onOpenDelete: () => void;
  onUpdateStatus: (status: RequestStatus) => void;
}

export function AdminRequestDetailDialog({
  isOpen,
  request,
  actionLoading,
  onClose,
  onOpenEdit,
  onOpenDelete,
  onUpdateStatus,
}: AdminRequestDetailDialogProps) {
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span>Need {getLabel(bloodGroupLabels, request.blood_group)}</span>
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
            </DialogTitle>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between gap-2 p-2 bg-muted/60 rounded-lg border font-mono text-xs">
              <span className="truncate">
                Request ID:{" "}
                <strong className="text-foreground select-all">
                  {request.id}
                </strong>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(request.id);
                  toast.success("Copied Request ID to clipboard!");
                }}
              >
                <Copy className="w-3 h-3" />
                Copy ID
              </Button>
            </div>
            <DialogDescription>
              Created on {new Date(request.created_at).toLocaleString()}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 text-sm">
          {/* Patient & Hospital Info */}
          <div className="space-y-3 p-3 bg-muted/40 rounded-xl border">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Medical & Location
            </h4>
            <div>
              <span className="text-xs text-muted-foreground block">
                Hospital & Area
              </span>
              <span className="font-medium text-foreground">
                {request.hospital_name
                  ? `${request.hospital_name} (${request.area_name})`
                  : request.area_name}
              </span>
            </div>

            {request.patient_name && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  Patient Name & Age
                </span>
                <span className="font-medium text-foreground">
                  {request.patient_name}{" "}
                  {request.patient_age ? `(${request.patient_age} yrs)` : ""}
                </span>
              </div>
            )}

            {request.disease && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  Disease / Reason
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {request.disease}
                </span>
              </div>
            )}

            <div>
              <span className="text-xs text-muted-foreground block">
                Component & Units
              </span>
              <span className="font-medium text-foreground">
                {getLabel(componentTypeLabels, request.component_type)} •{" "}
                {request.units_fulfilled} / {request.units_needed} bags
              </span>
            </div>
          </div>

          {/* Requester & Contact Info */}
          <div className="space-y-3 p-3 bg-muted/40 rounded-xl border">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Requester & Contact
            </h4>
            <div>
              <span className="text-xs text-muted-foreground block">
                Requester Name
              </span>
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                {request.requester?.name || "Unknown"}
              </span>
            </div>

            {request.contact_phone && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  Contact Phone
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <a
                    href={`tel:${request.contact_phone}`}
                    className="hover:underline text-emerald-700 dark:text-emerald-400"
                  >
                    {request.contact_phone}
                  </a>
                </span>
              </div>
            )}

            {request.needed_time && (
              <div>
                <span className="text-xs text-muted-foreground block">
                  Needed Time
                </span>
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {new Date(request.needed_time).toLocaleString()}
                </span>
              </div>
            )}

            <div>
              <span className="text-xs text-muted-foreground block">
                Urgency Level
              </span>
              <Badge
                variant={
                  request.urgency === "CRITICAL"
                    ? "destructive"
                    : request.urgency === "URGENT"
                      ? "default"
                      : "secondary"
                }
                className="text-xs mt-1"
              >
                {getLabel(urgencyLabels, request.urgency)}
              </Badge>
            </div>
          </div>
        </div>

        {request.patient_note && (
          <div className="p-3 bg-muted/30 rounded-xl border text-xs">
            <span className="font-semibold text-muted-foreground block mb-1">
              Requester Note:
            </span>
            <p className="text-foreground">{request.patient_note}</p>
          </div>
        )}

        {/* Action Buttons */}
        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href={`/requests/${request.id}`}
              target="_blank"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" size="sm" className="w-full text-xs">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                View Public Page
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenEdit}
              disabled={actionLoading}
              className="text-xs border-zinc-300 text-foreground hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Edit Details
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onOpenDelete}
              disabled={actionLoading}
              className="text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>

            {request.status !== "OPEN" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus(RequestStatus.OPEN)}
                disabled={actionLoading}
                className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Approve / Open
              </Button>
            )}

            {request.status !== "FULFILLED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus(RequestStatus.FULFILLED)}
                disabled={actionLoading}
                className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Mark Fulfilled
              </Button>
            )}

            {request.status !== "CANCELLED" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onUpdateStatus(RequestStatus.CANCELLED)}
                disabled={actionLoading}
                className="text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject / Cancel
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
