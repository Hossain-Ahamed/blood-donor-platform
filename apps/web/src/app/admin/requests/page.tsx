"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { BloodGroup, RequestStatus } from "@repo/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ban, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface RequestWithRequester {
  id: string;
  blood_group: string;
  area_name: string;
  units_needed: number;
  units_fulfilled: number;
  status: string;
  created_at: string;
  requester: {
    id: string;
    name: string;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<RequestWithRequester[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState<string>("all");
  const [bloodGroup, setBloodGroup] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog state
  const [selectedRequest, setSelectedRequest] =
    useState<RequestWithRequester | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (status !== "all") params.append("status", status);
      if (bloodGroup !== "all") params.append("blood_group", bloodGroup);

      const response = await apiClient.request<
        PaginatedResponse<RequestWithRequester>
      >(`/admin/requests?${params.toString()}`);

      const data = (response as any).data?.data
        ? (response as any).data
        : response;
      setRequests(data.data);
      setTotalPages(data.meta.totalPages);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [status, bloodGroup, page]);

  const handleForceCancel = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    try {
      await apiClient.request(`/admin/requests/${selectedRequest.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: RequestStatus.CANCELLED }),
      });

      toast.success("Request force-cancelled successfully");
      fetchRequests();
      closeDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel request");
    } finally {
      setActionLoading(false);
    }
  };

  const closeDialog = () => {
    setSelectedRequest(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-end">
        <div className="flex gap-4">
          <Select
            value={status}
            onValueChange={(val: string | null) => {
              setStatus(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(RequestStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={bloodGroup}
            onValueChange={(val: string | null) => {
              setBloodGroup(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Blood Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Blood Groups</SelectItem>
              {Object.values(BloodGroup).map((bg) => (
                <SelectItem key={bg} value={bg}>
                  {bg.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Blood Group</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-30">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(request.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {request.requester?.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="destructive"
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {request.blood_group.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.area_name}</TableCell>
                  <TableCell>
                    {request.units_fulfilled} / {request.units_needed} units
                  </TableCell>
                  <TableCell>
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
                    >
                      {request.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/requests/${request.id}`} target="_blank">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Force cancel"
                        disabled={
                          request.status === "CANCELLED" ||
                          request.status === "FULFILLED"
                        }
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Ban className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Cancel Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to force cancel this request? This action
              will mark the request as cancelled and donors will no longer be
              able to respond to it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceCancel}
              disabled={actionLoading}
            >
              {actionLoading ? "Cancelling..." : "Force Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
