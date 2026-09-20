"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HistoryPaginatedSectionProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemKey: (item: T, index: number) => string | number;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  emptyState?: React.ReactNode;
  itemLabel?: string;
  className?: string;
}

export function HistoryPaginatedSection<T>({
  items,
  renderItem,
  itemKey,
  pageSizeOptions = [5, 10, 20],
  defaultPageSize = 5,
  emptyState,
  itemLabel = "items",
  className = "space-y-4",
}: HistoryPaginatedSectionProps<T>) {
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);

  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const currentItems = items.slice(startIndex, endIndex);

  return (
    <div className={className}>
      <div className="space-y-3">
        {currentItems.map((item, idx) => (
          <React.Fragment key={itemKey(item, startIndex + idx)}>
            {renderItem(item, startIndex + idx)}
          </React.Fragment>
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-4 border-t mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(val: string | null) => {
                  if (val) {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }
                }}
              >
                <SelectTrigger className="h-8 w-[68px] text-xs">
                  <SelectValue placeholder={pageSize.toString()} />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt.toString()}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span>
              Showing {items.length > 0 ? startIndex + 1 : 0} to {endIndex} of{" "}
              {items.length} {itemLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={activePage <= 1}
              className="h-8 text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </Button>

            <span className="font-medium px-2 text-foreground">
              Page {activePage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage >= totalPages}
              className="h-8 text-xs gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
