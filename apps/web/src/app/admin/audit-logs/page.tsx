"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Code, Search } from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  meta: Record<string, unknown> | null;
  created_at: string;
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

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [action, setActionFilter] = useState<string>("all");
  const [targetType, setTargetType] = useState<string>("all");
  const [adminId, setAdminId] = useState("");
  const [debouncedAdminId, setDebouncedAdminId] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Meta viewer
  const [selectedMeta, setSelectedMeta] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAdminId(adminId);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [adminId]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (action !== "all") params.append("action", action);
      if (targetType !== "all") params.append("target_type", targetType);
      if (debouncedAdminId) params.append("admin_id", debouncedAdminId);

      const response = await apiClient.request<PaginatedResponse<AuditLog>>(
        `/admin/audit-logs?${params.toString()}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (response as any).data?.data
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (response as any).data
        : response;
      setLogs(data.data as AuditLog[]);
      setTotalPages(data.meta.totalPages as number);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch audit logs",
      );
    } finally {
      setLoading(false);
    }
  }, [action, targetType, debouncedAdminId, page]);

  useEffect(() => {
    const loadData = async () => {
      await fetchLogs();
    };
    loadData();
  }, [fetchLogs]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Admin ID..."
            className="pl-8"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select
            value={action}
            onValueChange={(val: string | null) => {
              setActionFilter(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="BLOCK_USER">Block User</SelectItem>
              <SelectItem value="UNBLOCK_USER">Unblock User</SelectItem>
              <SelectItem value="CHANGE_ROLE">Change Role</SelectItem>
              <SelectItem value="CANCEL_REQUEST">Cancel Request</SelectItem>
              <SelectItem value="REVIEW_REPORT">Review Report</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={targetType}
            onValueChange={(val: string | null) => {
              setTargetType(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Target Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="REQUEST">Request</SelectItem>
              <SelectItem value="REPORT">Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Admin ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="w-25">Meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.admin_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-xs font-semibold">
                        {log.target_type}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {log.target_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.meta ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMeta(log.meta)}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        None
                      </span>
                    )}
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
        open={!!selectedMeta}
        onOpenChange={(open) => !open && setSelectedMeta(null)}
      >
        <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Metadata</DialogTitle>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md overflow-x-auto">
            <pre className="text-sm font-mono">
              {JSON.stringify(selectedMeta, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
