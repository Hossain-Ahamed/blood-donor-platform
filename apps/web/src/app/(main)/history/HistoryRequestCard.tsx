import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bloodGroupLabels, requestStatusLabels, getLabel } from "@/lib/labels";

export type BloodRequestItem = {
  id: string;
  blood_group: string;
  created_at: string;
  status: string;
  area_name: string;
  hospital_name?: string | null;
  units_fulfilled: number;
  units_needed: number;
};

export function HistoryRequestCard({ request }: { request: BloodRequestItem }) {
  return (
    <Card className="transition-all hover:border-red-300">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400 font-black">
                {getLabel(bloodGroupLabels, request.blood_group)}
              </span>
              <span>Request</span>
            </CardTitle>
            <CardDescription>
              Created on {new Date(request.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
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
            className="text-xs uppercase font-semibold"
          >
            {getLabel(requestStatusLabels, request.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <strong>Area:</strong> {request.area_name}
          </p>
          <p>
            <strong>Units:</strong> {request.units_fulfilled} / {request.units_needed} bags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/requests/${request.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-medium border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
            >
              View & Manage &rarr;
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
