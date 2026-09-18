"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Copy, Check, UserCheck, ShieldCheck, Mail, MapPin, Flag } from "lucide-react";
import { toast } from "sonner";
import { User, ReportTargetType } from "@repo/shared";
import { ReportDialog } from "@/components/reports/ReportDialog";

interface RequesterInfoCardProps {
  requester?: Partial<User> | null;
  contactPhone: string;
  requesterProfile?: {
    area_name?: string | null;
    blood_group?: string | null;
    is_available?: boolean | null;
    last_donation_date?: string | Date | null;
  } | null;
}

export function RequesterInfoCard({
  requester,
  contactPhone,
  requesterProfile,
}: RequesterInfoCardProps) {
  const [copied, setCopied] = useState(false);
  const name = requester?.name || "Requester";
  const primaryPhone = contactPhone || requester?.phone || "";
  const profilePhone = requester?.phone;
  const avatarUrl = requester?.avatar_url;

  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "RQ";

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Phone number copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy phone number");
    }
  };

  return (
    <Card className="border-red-100 dark:border-red-950/40 bg-card overflow-hidden shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50 bg-red-50/30 dark:bg-red-950/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600 shrink-0" />
            Requester Details & Contact
          </CardTitle>
          <div className="flex items-center gap-2">
            {requester?.id && (
              <ReportDialog
                targetType={ReportTargetType.USER}
                targetId={requester.id}
                targetTitle={`Requester: ${name}`}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive h-7 px-2 flex items-center gap-1"
                  >
                    <Flag className="w-3 h-3" />
                    <span>Report</span>
                  </Button>
                }
              />
            )}
            <Badge
              variant="outline"
              className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900 text-xs flex items-center gap-1 font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
              Verified Requester
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="w-16 h-16 rounded-full ring-2 ring-red-500/30 shadow-md">
                {avatarUrl && (
                  <AvatarImage
                    src={avatarUrl}
                    alt={name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-gradient-to-br from-red-500 to-rose-600 text-white font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full"
                title="Active Requester"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight text-foreground">
                  {name}
                </h3>
                {requester?.role === "ADMIN" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    Admin
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span>Blood Request Coordinator</span>
                {requesterProfile?.area_name && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-red-500 inline" />
                      {requesterProfile.area_name}
                    </span>
                  </>
                )}
              </p>
              {requester?.email && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  {requester.email}
                </p>
              )}
            </div>
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            {primaryPhone ? (
              <>
                <div className="flex items-center justify-between sm:justify-end gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-red-600 animate-pulse" />
                    <span className="font-mono font-bold text-base text-foreground tracking-wide">
                      {primaryPhone}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 ml-1 hover:bg-background"
                    onClick={() => handleCopy(primaryPhone)}
                    title="Copy phone number"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a href={`tel:${primaryPhone}`} className="w-full sm:w-auto">
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Requester
                    </Button>
                  </a>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No phone number provided
              </p>
            )}
          </div>
        </div>

        {profilePhone && primaryPhone !== profilePhone && (
          <div className="pt-3 border-t border-dashed text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Alternate Profile Phone:{" "}
              <strong className="font-mono">{profilePhone}</strong>
            </span>
            <a
              href={`tel:${profilePhone}`}
              className="text-blue-600 hover:underline font-medium"
            >
              Call Alternate
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
