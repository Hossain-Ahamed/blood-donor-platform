"use client";

import {
  bloodGroupLabels,
  urgencyLabels,
  requestStatusLabels,
  componentTypeLabels,
  getLabel,
} from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, AlertTriangle } from "lucide-react";
import type { RequestWithRequester, RequestWithDistance } from "./types";

interface AdminRequestsTableProps {
  requests: RequestWithDistance[];
  selectedRequest: RequestWithRequester | null;
  loading: boolean;
  page: number;
  totalPages: number;
  onSelectRequest: (req: RequestWithRequester) => void;
  onPageChange: (newPage: number) => void;
}

export function AdminRequestsTable({
  requests,
  selectedRequest,
  loading,
  page,
  totalPages,
  onSelectRequest,
  onPageChange,
}: AdminRequestsTableProps) {
  return (
    <div className="w-full lg:w-5/12 flex flex-col gap-3 overflow-y-auto px-1.5 py-1">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {loading
            ? "Loading requests..."
            : `${requests.length} ${
                requests.length === 1 ? "Request" : "Requests"
              } shown (Page ${page}/${totalPages})`}
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl border border-dashed flex-1 gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base">No requests found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting status, blood group, or switching to &quot;All
              Locations&quot; to expand results.
            </p>
          </div>
        </div>
      ) : (
        requests.map((req) => {
          const isCritical = req.urgency === "CRITICAL";
          const isUrgent = req.urgency === "URGENT";
          const isSelected = selectedRequest?.id === req.id;

          return (
            <Card
              key={req.id}
              onClick={() => onSelectRequest(req)}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-red-400/80 ${
                isSelected
                  ? "ring-2 ring-red-500 border-transparent bg-red-500/5"
                  : "bg-card"
              } ${
                isCritical
                  ? "border-l-4 border-l-red-600"
                  : isUrgent
                    ? "border-l-4 border-l-amber-500"
                    : "border-l-4 border-l-blue-500"
              }`}
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-lg font-black text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-lg shrink-0">
                    {getLabel(bloodGroupLabels, req.blood_group)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-semibold truncate flex items-center gap-1.5">
                      {req.hospital_name || req.area_name}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{req.area_name}</span>
                      {req.distanceText && (
                        <span className="font-medium text-red-600 dark:text-red-400 ml-1 shrink-0">
                          • {req.distanceText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge
                    variant={
                      req.status === "OPEN"
                        ? "default"
                        : req.status === "FULFILLED"
                          ? "secondary"
                          : req.status === "CANCELLED"
                            ? "destructive"
                            : "outline"
                    }
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5"
                  >
                    {getLabel(requestStatusLabels, req.status)}
                  </Badge>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {getLabel(urgencyLabels, req.urgency)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-1 text-xs space-y-2">
                <div className="flex items-center justify-between text-muted-foreground pt-1 border-t">
                  <span>Units Needed:</span>
                  <span className="font-semibold text-foreground">
                    {req.units_fulfilled} / {req.units_needed} bags (
                    {getLabel(componentTypeLabels, req.component_type)})
                  </span>
                </div>

                {req.patient_name && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Patient:</span>
                    <span className="font-medium text-foreground">
                      {req.patient_name}{" "}
                      {req.patient_age ? `(${req.patient_age}y)` : ""}
                    </span>
                  </div>
                )}

                {req.needed_time && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" /> Needed By:
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(req.needed_time).toLocaleDateString()}{" "}
                      {new Date(req.needed_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 gap-2 border-t border-muted/50">
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className="text-[11px] text-muted-foreground truncate">
                      By: {req.requester?.name || "Anonymous"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/80 bg-muted px-1 rounded truncate shrink-0">
                      ID: {req.id.substring(0, 8)}...
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 font-medium shrink-0"
                  >
                    Manage &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1 || loading}
            className="h-8 text-xs"
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || loading}
            className="h-8 text-xs"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
