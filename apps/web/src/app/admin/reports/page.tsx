"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { ReportStatus, ReportTargetType } from "@repo/shared";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  reporter?: { name: string; email: string }; // Optional depending on backend populate
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await apiClient.request<Report[]>("/reports");
      // Handle NextJS wrapper or direct array return
      const data = (response as any).data || response;
      setReports(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: ReportStatus) => {
    try {
      await apiClient.request(`/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Report status updated");
      fetchReports();
    } catch (error: any) {
      toast.error(error.message || "Failed to update report status");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Reports Queue</h1>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
              <TableHead className="w-25">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No reports found.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(report.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <Badge variant="outline">{report.target_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {report.target_id.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-md truncate"
                    title={report.reason}
                  >
                    {report.reason}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        report.status === ReportStatus.PENDING
                          ? "default"
                          : report.status === ReportStatus.ACTIONED
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleUpdateStatus(
                              report.id,
                              ReportStatus.DISMISSED,
                            )
                          }
                          disabled={report.status === ReportStatus.DISMISSED}
                        >
                          <X className="mr-2 h-4 w-4" />
                          <span>Dismiss</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleUpdateStatus(report.id, ReportStatus.ACTIONED)
                          }
                          disabled={report.status === ReportStatus.ACTIONED}
                        >
                          <Check className="mr-2 h-4 w-4 text-destructive" />
                          <span className="text-destructive">
                            Mark Actioned
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
