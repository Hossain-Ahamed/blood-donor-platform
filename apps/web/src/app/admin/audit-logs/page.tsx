"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { EnrichedAuditLog } from "@repo/shared";
import { toHumanReadable } from "@/lib/labels";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  RotateCw,
  History,
  Shield,
  Activity,
  UserCheck,
  Code2,
  Copy,
  Check,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface AuditStats {
  totalLogs: number;
  actionsLast24Hours: number;
  mostFrequentAction: string;
  activeAdminsCount: number;
  actionBreakdown: Record<string, number>;
}

interface AdminUserOption {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface PaginatedAuditResponse {
  data: EnrichedAuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AdminAuditLogsPage() {
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  // Filters
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);

  // Changeset / Meta Inspector Modal
  const [selectedLog, setSelectedLog] = useState<EnrichedAuditLog | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // TanStack Query: Stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-audit-logs-stats"],
    queryFn: async () => {
      const res = await apiClient.request<AuditStats>("/admin/audit-logs/stats");
      const data = (res as any).data || res;
      return data as AuditStats;
    },
  });
  const stats = statsData ?? null;

  // TanStack Query: Admins list
  const { data: adminsList = [] } = useQuery({
    queryKey: ["admin-audit-logs-admins"],
    queryFn: async () => {
      const res = await apiClient.request<AdminUserOption[]>("/admin/audit-logs/admins");
      const data = (res as any).data || res;
      return (Array.isArray(data) ? data : []) as AdminUserOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // TanStack Query: Paginated Logs
  const { data: logsResponse, isLoading: loading } = useQuery({
    queryKey: [
      "admin-audit-logs",
      {
        page,
        limit,
        adminFilter,
        actionFilter,
        targetTypeFilter,
        startDate,
        endDate,
        debouncedSearch,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (adminFilter !== "all") params.append("admin_id", adminFilter);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (targetTypeFilter !== "all") params.append("target_type", targetTypeFilter);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await apiClient.request<PaginatedAuditResponse>(
        `/admin/audit-logs?${params.toString()}`,
      );
      const responseData = (res as any)?.data?.data ? (res as any).data : res;
      const logs = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
          ? responseData.data
          : [];
      const meta = responseData?.meta ?? (res as any)?.meta;
      const totalCount = Number(meta?.total ?? logs.length);
      const totalPages = Number((meta?.totalPages ?? Math.ceil(totalCount / limit)) || 1);

      return {
        logs: logs as EnrichedAuditLog[],
        totalPages,
        totalCount,
      };
    },
  });

  const logs = logsResponse?.logs ?? [];
  const totalPages = logsResponse?.totalPages ?? 1;
  const totalCount = logsResponse?.totalCount ?? 0;

  // Handle fresh DB reload
  const handleReloadFresh = () => {
    startTransition(() => {
      toast.info("Reloading audit logs directly from database...");
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs-stats"] });
    });
  };

  // Copy meta JSON to clipboard
  const handleCopyJson = async (meta: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
      setCopiedJson(true);
      toast.success("Payload copied to clipboard");
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  // Action badge styling helper
  const getActionBadge = (action: string) => {
    switch (action) {
      case "BLOCK_USER":
      case "CANCEL_REQUEST":
      case "DELETE_REQUEST":
        return (
          <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px]">
            {action}
          </Badge>
        );
      case "UNBLOCK_USER":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]">
            {action}
          </Badge>
        );
      case "REVIEW_REPORT":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px]">
            {action}
          </Badge>
        );
      case "CHANGE_ROLE":
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px]">
            {action}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-semibold text-[10px]">
            {action}
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <History className="w-8 h-8 text-primary" />
            <span>Audit Trail & Activity Log</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tamper-evident record of all administrative decisions, user blocks, and request moderations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReloadFresh}
            disabled={loading || statsLoading}
            className="flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            title="Bypass 1-min Redis cache and fetch fresh data"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${loading || statsLoading ? "animate-spin text-primary" : ""}`}
            />
            <span>Reload Fresh Data</span>
          </Button>
        </div>
      </div>

      {/* Metrics Bar (1-min cache, live) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Logged Actions</span>
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {stats ? stats.totalLogs : "..."}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Append-only audit ledger</p>
        </div>

        {/* Actions in Last 24 Hours */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Actions (Last 24h)</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats ? stats.actionsLast24Hours : "..."}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Recent moderation volume</p>
        </div>

        {/* Most Frequent Action */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Frequent Action</span>
            <Shield className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-lg font-bold text-amber-600 dark:text-amber-400 truncate">
            {stats ? stats.mostFrequentAction : "..."}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Primary administrative duty</p>
        </div>

        {/* Active Admins */}
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Active Admins</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats ? stats.activeAdminsCount : "..."}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Staff with recorded actions</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card p-4 rounded-xl border shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, target, or admin name/email..."
              className="pl-9 text-xs h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Admin Select (Populated with real Admins!) */}
          <Select
            value={adminFilter}
            onValueChange={(val: string | null) => {
              setAdminFilter(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Filter by Admin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Administrators</SelectItem>
              {adminsList.map((adm) => (
                <SelectItem key={adm.id} value={adm.id}>
                  {adm.name} ({adm.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Select */}
          <Select
            value={actionFilter}
            onValueChange={(val: string | null) => {
              setActionFilter(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Filter by Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="BLOCK_USER">BLOCK_USER</SelectItem>
              <SelectItem value="UNBLOCK_USER">UNBLOCK_USER</SelectItem>
              <SelectItem value="CHANGE_ROLE">CHANGE_ROLE</SelectItem>
              <SelectItem value="CANCEL_REQUEST">CANCEL_REQUEST</SelectItem>
              <SelectItem value="REVIEW_REPORT">REVIEW_REPORT</SelectItem>
              <SelectItem value="DELETE_REQUEST">DELETE_REQUEST</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: Target Type & Date Range */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Target Type */}
          <Select
            value={targetTypeFilter}
            onValueChange={(val: string | null) => {
              setTargetTypeFilter(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="REQUEST">Blood Request</SelectItem>
              <SelectItem value="REPORT">Report</SelectItem>
            </SelectContent>
          </Select>

          {/* Start Date */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>From:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs w-[140px]"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs w-[140px]"
            />
          </div>

          {(adminFilter !== "all" ||
            actionFilter !== "all" ||
            targetTypeFilter !== "all" ||
            startDate ||
            endDate ||
            search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdminFilter("all");
                setActionFilter("all");
                setTargetTypeFilter("all");
                setStartDate("");
                setEndDate("");
                setSearch("");
                setPage(1);
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[150px] text-xs font-semibold">Timestamp</TableHead>
              <TableHead className="text-xs font-semibold">Administrator</TableHead>
              <TableHead className="w-[150px] text-xs font-semibold">Action</TableHead>
              <TableHead className="text-xs font-semibold">Target Entity</TableHead>
              <TableHead className="w-[110px] text-right text-xs font-semibold">Changeset</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <RotateCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading audit records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-36">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <History className="w-8 h-8 text-muted-foreground/40" />
                    <span className="font-semibold text-foreground">No audit records found</span>
                    <span>Try clearing your search or date filters.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const admin = log.admin;
                const target = log.target;

                return (
                  <TableRow key={log.id} className="text-xs hover:bg-muted/30 transition-colors">
                    {/* Date & Time */}
                    <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      <div>{new Date(log.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] opacity-70">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </TableCell>

                    {/* Admin Profile */}
                    <TableCell>
                      {admin ? (
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7 shrink-0 ring-1 ring-border">
                            {admin.avatar_url && <AvatarImage src={admin.avatar_url} />}
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {admin.name?.[0]?.toUpperCase() || "A"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate max-w-[170px]">
                            <div className="font-semibold text-foreground truncate">
                              {admin.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {admin.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ID: {log.admin_id.slice(0, 8)}...
                        </span>
                      )}
                    </TableCell>

                    {/* Action Badge */}
                    <TableCell>{getActionBadge(log.action)}</TableCell>

                    {/* Target Information */}
                    <TableCell>
                      <div className="space-y-0.5 max-w-[260px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 font-semibold">
                            {log.target_type}
                          </Badge>
                          {target?.status && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 py-0 font-medium"
                            >
                              {target.status}
                            </Badge>
                          )}
                        </div>

                        <div className="font-medium text-foreground truncate">
                          {toHumanReadable(target?.label) || `ID: ${log.target_id.slice(0, 8)}...`}
                        </div>

                        {target?.details && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {toHumanReadable(target.details)}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Changeset / Meta Inspector */}
                    <TableCell className="text-right">
                      {log.meta ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowRawJson(false);
                          }}
                          className="h-7 px-2 text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 italic">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground py-2 border-t pt-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={limit.toString()}
              onValueChange={(val: string | null) => {
                if (val) {
                  setLimit(Number(val));
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-8 w-[72px] text-xs">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            Showing {totalCount > 0 ? (page - 1) * limit + 1 : 0} to{" "}
            {Math.min(page * limit, totalCount)} of {totalCount} logs
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="h-8 text-xs gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </Button>

          <span className="font-medium px-2 text-foreground">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="h-8 text-xs gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Changeset / Meta Inspector Modal */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                <span>Audit Changeset & Metadata</span>
              </DialogTitle>
              {selectedLog && getActionBadge(selectedLog.action)}
            </div>
            <DialogDescription className="text-xs">
              Recorded at {selectedLog && new Date(selectedLog.created_at).toLocaleString()} by{" "}
              {selectedLog?.admin?.name || selectedLog?.admin_id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-xs">
              {/* Target & Admin Quick Summary */}
              <div className="bg-muted/50 rounded-lg p-3 border grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Target</span>
                  <div className="font-bold text-foreground truncate">
                    {toHumanReadable(selectedLog.target?.label) || selectedLog.target_id}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Target Type</span>
                  <Badge variant="outline" className="text-[10px] font-bold mt-0.5">
                    {selectedLog.target_type}
                  </Badge>
                </div>
              </div>

              {/* Visual Diff View (Before vs After) if present */}
              {selectedLog.meta &&
              (selectedLog.meta.before !== undefined || selectedLog.meta.after !== undefined) &&
              !showRawJson ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-xs">State Transition</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRawJson(true)}
                      className="h-6 text-[11px] text-muted-foreground"
                    >
                      Show Raw JSON
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Before Box */}
                    <div className="rounded-lg border border-red-200 dark:border-red-950/60 bg-red-50/40 dark:bg-red-950/20 p-3 space-y-1">
                      <div className="text-[11px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                        <span>Before</span>
                      </div>
                      <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground mt-1">
                        {JSON.stringify(selectedLog.meta.before, null, 2)}
                      </pre>
                    </div>

                    {/* After Box */}
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-1">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>After</span>
                      </div>
                      <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground mt-1">
                        {JSON.stringify(selectedLog.meta.after, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Additional notes if present */}
                  {selectedLog.meta.admin_note && (
                    <div className="bg-muted p-2.5 rounded-lg border text-xs">
                      <span className="font-semibold text-muted-foreground block text-[10px]">
                        Admin Note:
                      </span>
                      <p className="text-foreground mt-0.5 italic">
                        &ldquo;{String(selectedLog.meta.admin_note)}&rdquo;
                      </p>
                    </div>
                  )}

                  {selectedLog.meta.reason && (
                    <div className="bg-muted p-2.5 rounded-lg border text-xs">
                      <span className="font-semibold text-muted-foreground block text-[10px]">
                        Reason:
                      </span>
                      <p className="text-foreground mt-0.5">{String(selectedLog.meta.reason)}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Raw JSON View */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-xs">Raw Metadata</span>
                    <div className="flex items-center gap-2">
                      {selectedLog.meta?.before !== undefined && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRawJson(false)}
                          className="h-6 text-[11px] text-muted-foreground"
                        >
                          Show Diff View
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyJson(selectedLog.meta)}
                        className="h-6 text-[11px] gap-1 px-2"
                      >
                        {copiedJson ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedJson ? "Copied" : "Copy JSON"}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/70 p-3 rounded-lg border overflow-x-auto max-h-[300px]">
                    <pre className="text-xs font-mono text-foreground">
                      {JSON.stringify(selectedLog.meta, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
