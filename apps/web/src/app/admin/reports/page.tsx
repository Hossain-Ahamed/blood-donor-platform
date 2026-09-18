"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ReportStatus,
  ReportTargetType,
  EnrichedReport,
} from "@repo/shared";
import { toHumanReadable } from "@/lib/labels";
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
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RotateCw,
  Eye,
  ShieldAlert,
  UserX,
  FileX,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

interface ReportStats {
  total: number;
  pending: number;
  reviewed: number;
  actioned: number;
  dismissed: number;
  userReports: number;
  requestReports: number;
}

interface PaginatedReportsResponse {
  data: EnrichedReport[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAuth();
  const [, startTransition] = useTransition();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Review Modal State
  const [selectedReport, setSelectedReport] = useState<EnrichedReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReportStatus>(ReportStatus.ACTIONED);
  const [adminNote, setAdminNote] = useState<string>("");
  const [executeTargetAction, setExecuteTargetAction] = useState<boolean>(true);

  // Detail Inspector Modal
  const [inspectingReport, setInspectingReport] = useState<EnrichedReport | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // TanStack Query: Stats
  // TanStack Query: Stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-reports-stats"],
    queryFn: async () => {
      const res = await apiClient.request<ReportStats>("/reports/stats?fresh=true");
      const data = (res as any).data || res;
      return data as ReportStats;
    },
  });
  const stats = statsData ?? null;

  // TanStack Query: Paginated Reports
  const { data: reportsResponse, isLoading: loading } = useQuery({
    queryKey: [
      "admin-reports",
      { page, limit, statusFilter, targetTypeFilter, debouncedSearch },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        fresh: "true",
      });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (targetTypeFilter !== "all") params.append("target_type", targetTypeFilter);
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await apiClient.request<PaginatedReportsResponse>(
        `/reports?${params.toString()}`,
      );
      const json = (res as any).data?.data ? (res as any).data : res;

      return {
        reports: (json.data || []) as EnrichedReport[],
        totalPages: (json.meta?.totalPages || 1) as number,
        totalCount: (json.meta?.total || 0) as number,
      };
    },
  });

  const reports = reportsResponse?.reports ?? [];
  const totalPages = reportsResponse?.totalPages ?? 1;
  const totalCount = reportsResponse?.totalCount ?? 0;

  // Handle Refreshing with cache invalidation
  const handleReloadFresh = () => {
    startTransition(() => {
      toast.info("Reloading reports data directly from database...");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-stats"] });
    });
  };

  // Open Review Dialog
  const handleOpenReview = (report: EnrichedReport) => {
    setSelectedReport(report);
    setReviewStatus(ReportStatus.ACTIONED);
    setAdminNote("");
    const isSelfTarget =
      report.target_type === ReportTargetType.USER &&
      report.target_id === currentAdmin?.id;
    setExecuteTargetAction(!isSelfTarget);
  };

  // Mutation: Submit Review / Action
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) return;
      let action_target: "BLOCK_USER" | "CANCEL_REQUEST" | "NONE" = "NONE";
      if (executeTargetAction && reviewStatus === ReportStatus.ACTIONED) {
        if (selectedReport.target_type === ReportTargetType.USER) {
          action_target = "BLOCK_USER";
        } else if (selectedReport.target_type === ReportTargetType.REQUEST) {
          action_target = "CANCEL_REQUEST";
        }
      }

      return apiClient.request(`/reports/${selectedReport.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: reviewStatus,
          admin_note: adminNote.trim() || undefined,
          action_target,
        }),
      });
    },
    onSuccess: () => {
      const isTargetAction = executeTargetAction && reviewStatus === ReportStatus.ACTIONED && selectedReport;
      toast.success(
        isTargetAction
          ? `Report actioned and target ${selectedReport!.target_type.toLowerCase()} updated.`
          : "Report status updated successfully.",
      );

      // Immediately update the report status and reviewer in TanStack Query's cache
      if (selectedReport) {
        const reportId = selectedReport.id;
        const newStatus = reviewStatus;
        const note = adminNote.trim();
        const willBlock =
          executeTargetAction &&
          newStatus === ReportStatus.ACTIONED &&
          selectedReport.target_type === ReportTargetType.USER;
        const willCancel =
          executeTargetAction &&
          newStatus === ReportStatus.ACTIONED &&
          selectedReport.target_type === ReportTargetType.REQUEST;

        queryClient.setQueriesData(
          { queryKey: ["admin-reports"] },
          (old: any) => {
            if (!old || !Array.isArray(old.reports)) return old;
            return {
              ...old,
              reports: old.reports.map((r: EnrichedReport) => {
                if (r.id !== reportId) return r;
                return {
                  ...r,
                  status: newStatus,
                  admin_note: note || r.admin_note,
                  reviewer: currentAdmin
                    ? {
                        id: currentAdmin.id,
                        name: currentAdmin.name,
                        email: currentAdmin.email,
                      }
                    : r.reviewer,
                  reviewed_at: new Date().toISOString(),
                  target: r.target
                    ? {
                        ...r.target,
                        status: willBlock
                          ? "INACTIVE"
                          : willCancel
                            ? "CANCELLED"
                            : r.target.status,
                      }
                    : undefined,
                };
              }),
            };
          },
        );
      }

      setSelectedReport(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-stats"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    },
  });

  const handleSubmitReview = () => reviewMutation.mutate();
  const submittingAction = reviewMutation.isPending;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Fresh Reload Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-500" />
            <span>Reports & Abuse Queue</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and investigate reported users and emergency blood requests.
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

      {/* Metric Cards (1-min cache, live) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div
          onClick={() => {
            setStatusFilter(ReportStatus.PENDING);
            setPage(1);
          }}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-xs ${
            statusFilter === ReportStatus.PENDING
              ? "border-amber-500 bg-amber-500/10 dark:bg-amber-950/30 ring-2 ring-amber-500/30"
              : "border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pending Attention</span>
            {stats && stats.pending > 0 ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            ) : (
              <Clock className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats ? stats.pending : "..."}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Requires admin resolution</p>
        </div>

        {/* Actioned Card */}
        <div
          onClick={() => {
            setStatusFilter(ReportStatus.ACTIONED);
            setPage(1);
          }}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-xs ${
            statusFilter === ReportStatus.ACTIONED
              ? "border-red-500 bg-red-500/10 dark:bg-red-950/30 ring-2 ring-red-500/30"
              : "border-border bg-card hover:border-red-500/50 hover:bg-red-500/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Actioned / Penalized</span>
            <CheckCircle2 className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
            {stats ? stats.actioned : "..."}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Blocked users / cancelled requests</p>
        </div>

        {/* Dismissed Card */}
        <div
          onClick={() => {
            setStatusFilter(ReportStatus.DISMISSED);
            setPage(1);
          }}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-xs ${
            statusFilter === ReportStatus.DISMISSED
              ? "border-slate-500 bg-slate-500/10 ring-2 ring-slate-500/30"
              : "border-border bg-card hover:border-slate-500/50 hover:bg-slate-500/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Dismissed</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-300">
            {stats ? stats.dismissed : "..."}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Marked invalid or resolved</p>
        </div>

        {/* Total Reports Card */}
        <div
          onClick={() => {
            setStatusFilter("all");
            setTargetTypeFilter("all");
            setPage(1);
          }}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 shadow-xs ${
            statusFilter === "all" && targetTypeFilter === "all"
              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
              : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Reports</span>
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {stats ? stats.total : "..."}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {stats ? `${stats.userReports} Users • ${stats.requestReports} Requests` : "All recorded flags"}
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-xl border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reason, reporter name, email..."
            className="pl-9 text-xs h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Select */}
          <Select
            value={statusFilter}
            onValueChange={(val: string | null) => {
              setStatusFilter(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[145px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={ReportStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={ReportStatus.REVIEWED}>Reviewed</SelectItem>
              <SelectItem value={ReportStatus.ACTIONED}>Actioned</SelectItem>
              <SelectItem value={ReportStatus.DISMISSED}>Dismissed</SelectItem>
            </SelectContent>
          </Select>

          {/* Target Type Select */}
          <Select
            value={targetTypeFilter}
            onValueChange={(val: string | null) => {
              setTargetTypeFilter(val || "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[145px] h-9 text-xs">
              <SelectValue placeholder="Target Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              <SelectItem value={ReportTargetType.USER}>User Profiles</SelectItem>
              <SelectItem value={ReportTargetType.REQUEST}>Blood Requests</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== "all" || targetTypeFilter !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setTargetTypeFilter("all");
                setSearch("");
                setPage(1);
              }}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[120px] text-xs font-semibold">Reported At</TableHead>
              <TableHead className="text-xs font-semibold">Reported Target</TableHead>
              <TableHead className="text-xs font-semibold">Reporter</TableHead>
              <TableHead className="text-xs font-semibold">Reason</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Reviewer</TableHead>
              <TableHead className="w-[130px] text-right text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <RotateCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading reports queue...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-36">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
                    <span className="font-semibold text-foreground">No reports match criteria</span>
                    <span>All clear! No pending abuse reports found.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => {
                const target = report.target;
                const isUser = report.target_type === ReportTargetType.USER;
                const isPending = report.status === ReportStatus.PENDING;

                return (
                  <TableRow
                    key={report.id}
                    className={`transition-colors text-xs ${
                      isPending ? "bg-amber-500/5 hover:bg-amber-500/10" : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Timestamp */}
                    <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      <div>{new Date(report.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] opacity-70">
                        {new Date(report.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </TableCell>

                    {/* Target Information */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-bold ${
                              isUser
                                ? "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40"
                                : "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                            }`}
                          >
                            {report.target_type}
                          </Badge>
                          {target?.status && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1 py-0 ${
                                target.status === "ACTIVE" || target.status === "OPEN"
                                  ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                                  : "text-red-700 bg-red-50 dark:bg-red-950/40"
                              }`}
                            >
                              {target.status}
                            </Badge>
                          )}
                        </div>

                        <div className="font-semibold text-foreground truncate max-w-[220px]">
                          {toHumanReadable(target?.label) || `ID: ${report.target_id.slice(0, 8)}...`}
                        </div>

                        {target?.details && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                            {toHumanReadable(target.details)}
                          </div>
                        )}

                        {/* Quick link to target */}
                        {isUser ? (
                          <Link
                            href={`/admin/users?search=${encodeURIComponent(target?.label || "")}`}
                            className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline font-medium"
                          >
                            <span>Manage user</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        ) : (
                          <Link
                            href={`/requests/${report.target_id}`}
                            className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline font-medium"
                          >
                            <span>View request</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </TableCell>

                    {/* Reporter */}
                    <TableCell>
                      {report.reporter ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6 shrink-0 ring-1 ring-border">
                            {report.reporter.avatar_url && (
                              <AvatarImage src={report.reporter.avatar_url} />
                            )}
                            <AvatarFallback className="text-[9px] font-bold bg-muted text-foreground">
                              {report.reporter.name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate max-w-[140px]">
                            <div className="font-medium text-foreground truncate">
                              {report.reporter.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {report.reporter.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {report.reporter_id.slice(0, 8)}...
                        </span>
                      )}
                    </TableCell>

                    {/* Reason */}
                    <TableCell>
                      <div
                        className="max-w-[240px] line-clamp-2 text-foreground font-medium cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setInspectingReport(report)}
                        title="Click to view full reason"
                      >
                        {report.reason}
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <Badge
                        variant={
                          report.status === ReportStatus.PENDING
                            ? "default"
                            : report.status === ReportStatus.ACTIONED
                              ? "destructive"
                              : "secondary"
                        }
                        className={`text-[11px] font-semibold ${
                          report.status === ReportStatus.PENDING
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : report.status === ReportStatus.ACTIONED
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : report.status === ReportStatus.REVIEWED
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {report.status}
                      </Badge>
                    </TableCell>

                    {/* Reviewer */}
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {report.reviewer ? (
                        <div>
                          <div className="font-medium text-foreground">
                            {report.reviewer.name}
                          </div>
                          {report.reviewed_at && (
                            <div className="text-[10px]">
                              {new Date(report.reviewed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Unreviewed</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectingReport(report)}
                          className="h-7 w-7 p-0"
                          title="Inspect Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant={isPending ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleOpenReview(report)}
                          className={`h-7 px-2 text-xs font-semibold gap-1 ${
                            isPending
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>{isPending ? "Action" : "Edit"}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground py-2">
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} reports
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
      )}

      {/* Review & Resolution Modal */}
      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-500 mb-1">
              <ShieldAlert className="w-5 h-5" />
              <DialogTitle>Resolve Report</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Review details and execute administrative penalties or dismissal.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-2">
              {/* Target & Reason Card */}
              <div className="bg-muted/40 rounded-lg p-3 border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Target</span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {selectedReport.target_type}
                  </Badge>
                </div>
                <div className="font-bold text-foreground text-sm">
                  {toHumanReadable(selectedReport.target?.label) || selectedReport.target_id}
                </div>
                {selectedReport.target?.details && (
                  <div className="text-muted-foreground">{toHumanReadable(selectedReport.target.details)}</div>
                )}
                <div className="pt-2 border-t border-border/60">
                  <span className="font-semibold text-muted-foreground block mb-0.5">Reason:</span>
                  <p className="text-foreground italic bg-background p-2 rounded border">
                    &ldquo;{selectedReport.reason}&rdquo;
                  </p>
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Resolution Decision</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus(ReportStatus.ACTIONED)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      reviewStatus === ReportStatus.ACTIONED
                        ? "border-red-600 bg-red-600 text-white shadow-xs"
                        : "border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Actioned</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus(ReportStatus.REVIEWED)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      reviewStatus === ReportStatus.REVIEWED
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                        : "border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Reviewed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus(ReportStatus.DISMISSED)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      reviewStatus === ReportStatus.DISMISSED
                        ? "border-slate-600 bg-slate-600 text-white shadow-xs"
                        : "border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Dismissed</span>
                  </button>
                </div>
              </div>

              {/* Optional Target Penalty Checkbox */}
              {reviewStatus === ReportStatus.ACTIONED && (
                <>
                  {selectedReport.target_type === ReportTargetType.USER &&
                  selectedReport.target_id === currentAdmin?.id ? (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-1 text-xs">
                      <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Self-Account Protected</span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        You are the reported user. Administrators cannot block their own account.
                        Please have another platform administrator review this report.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-200 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/20 p-3 space-y-2 text-xs">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={executeTargetAction}
                          onChange={(e) => setExecuteTargetAction(e.target.checked)}
                          className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500"
                        />
                        <div>
                          {selectedReport.target_type === ReportTargetType.USER ? (
                            <div className="font-semibold text-red-900 dark:text-red-300 flex items-center gap-1">
                              <UserX className="w-3.5 h-3.5" />
                              <span>Immediately Block this User Account (is_active = false)</span>
                            </div>
                          ) : (
                            <div className="font-semibold text-red-900 dark:text-red-300 flex items-center gap-1">
                              <FileX className="w-3.5 h-3.5" />
                              <span>Immediately Cancel this Blood Request (status = CANCELLED)</span>
                            </div>
                          )}
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            This action will be automatically recorded in the super-admin audit logs.
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </>
              )}

              {/* Admin Note */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-note" className="text-xs font-semibold">
                  Resolution Note / Reason (Optional)
                </Label>
                <Textarea
                  id="admin-note"
                  placeholder="Explain why this action was taken (for audit records)..."
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedReport(null)}
              disabled={submittingAction}
            >
              Cancel
            </Button>
            <Button
              variant={reviewStatus === ReportStatus.ACTIONED ? "destructive" : "default"}
              size="sm"
              onClick={handleSubmitReview}
              disabled={submittingAction}
              className="gap-1.5 font-semibold"
            >
              {submittingAction && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm & Save</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Inspection Modal */}
      <Dialog
        open={!!inspectingReport}
        onOpenChange={(open) => !open && setInspectingReport(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <span>Report Details</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Full breakdown of reported infraction and reporter data.
            </DialogDescription>
          </DialogHeader>

          {inspectingReport && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <span className="text-muted-foreground font-semibold">Reason:</span>
                <p className="text-foreground font-medium whitespace-pre-wrap">
                  {inspectingReport.reason}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="border p-2.5 rounded-lg">
                  <span className="text-muted-foreground block text-[10px]">Target Type</span>
                  <Badge variant="outline" className="mt-1 font-bold">
                    {inspectingReport.target_type}
                  </Badge>
                </div>
                <div className="border p-2.5 rounded-lg">
                  <span className="text-muted-foreground block text-[10px]">Status</span>
                  <Badge className="mt-1 font-bold">{inspectingReport.status}</Badge>
                </div>
              </div>

              <div className="border p-2.5 rounded-lg space-y-1">
                <span className="text-muted-foreground block text-[10px]">Target Details</span>
                <div className="font-semibold text-foreground">
                  {toHumanReadable(inspectingReport.target?.label) || inspectingReport.target_id}
                </div>
                {inspectingReport.target?.details && (
                  <div className="text-muted-foreground text-[11px]">
                    {toHumanReadable(inspectingReport.target.details)}
                  </div>
                )}
              </div>

              <div className="border p-2.5 rounded-lg space-y-1">
                <span className="text-muted-foreground block text-[10px]">Reporter</span>
                <div className="font-semibold text-foreground">
                  {inspectingReport.reporter?.name || inspectingReport.reporter_id}
                </div>
                {inspectingReport.reporter?.email && (
                  <div className="text-muted-foreground text-[11px]">
                    {inspectingReport.reporter.email}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectingReport(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
