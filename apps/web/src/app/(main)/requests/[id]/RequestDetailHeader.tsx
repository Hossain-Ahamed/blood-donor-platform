import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ExternalLink, Flag } from "lucide-react";
import { bloodGroupLabels, getLabel } from "@/lib/labels";
import { BloodGroup, User, ReportTargetType } from "@repo/shared";
import { ReportDialog } from "@/components/reports/ReportDialog";

interface RequestDetailHeaderProps {
  id: string;
  bloodGroup: BloodGroup;
  urgency?: string;
  createdAt: string | Date;
  user: User | null;
}

export function RequestDetailHeader({
  id,
  bloodGroup,
  urgency,
  createdAt,
  user,
}: RequestDetailHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight">
            Need {getLabel(bloodGroupLabels, bloodGroup)}
          </h1>
          {urgency === "CRITICAL" ? (
            <Badge
              variant="destructive"
              className="text-xs px-2.5 py-1 font-bold bg-red-600 animate-pulse shadow-xs"
            >
              Critical (Immediate)
            </Badge>
          ) : urgency === "URGENT" ? (
            <Badge className="text-xs px-2.5 py-1 font-bold bg-amber-600 hover:bg-amber-600 text-white shadow-xs">
              Urgent (Within 24h)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs px-2.5 py-1 font-semibold border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
            >
              Normal Urgency
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Requested on{" "}
          {new Date(createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
        {user?.role === "ADMIN" && (
          <Link href={`/admin/requests?requestId=${id}`}>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50 flex items-center gap-1.5 font-semibold text-xs h-9 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
              <span>Show full detail</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-70" />
            </Button>
          </Link>
        )}

        <ReportDialog
          targetType={ReportTargetType.REQUEST}
          targetId={id}
          targetTitle={`Need ${getLabel(bloodGroupLabels, bloodGroup)}`}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 flex items-center gap-1.5 font-medium text-xs h-9 shadow-xs"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </Button>
          }
        />


        {urgency === "CRITICAL" ? (
          <Badge
            variant="destructive"
            className="text-sm md:text-base px-3.5 py-1.5 font-bold bg-red-600 animate-pulse shadow-xs"
          >
            🚨 Critical Urgency
          </Badge>
        ) : urgency === "URGENT" ? (
          <Badge className="text-sm md:text-base px-3.5 py-1.5 font-bold bg-amber-600 hover:bg-amber-600 text-white shadow-xs">
            ⚡ Urgent (Within 24h)
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-sm md:text-base px-3.5 py-1.5 font-semibold border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
          >
            Normal Urgency
          </Badge>
        )}
      </div>
    </div>
  );
}
