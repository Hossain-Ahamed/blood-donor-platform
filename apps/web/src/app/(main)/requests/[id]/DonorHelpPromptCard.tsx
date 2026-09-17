import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

interface DonorHelpPromptCardProps {
  id: string;
  contactPhone?: string | null;
  hasUser: boolean;
  isProfileComplete: boolean;
  hasPhone: boolean;
}

export function DonorHelpPromptCard({
  id,
  contactPhone,
  hasUser,
  isProfileComplete,
  hasPhone,
}: DonorHelpPromptCardProps) {
  if (!hasUser) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle>Can you help?</CardTitle>
          <CardDescription>Offer to donate blood for this request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              You must be logged in to offer a blood donation for this request.
            </p>
          </div>

          {contactPhone && (
            <div className="rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3.5 text-center space-y-2">
              <span className="text-xs text-muted-foreground font-medium block">
                Patient / Attendant Contact:
              </span>
              <a
                href={`tel:${contactPhone}`}
                className="font-bold text-base text-red-600 dark:text-red-400 hover:underline flex items-center justify-center gap-1.5 tracking-wide"
              >
                <Phone className="w-4 h-4" />
                {contactPhone}
              </a>
              <a href={`tel:${contactPhone}`} className="block pt-1">
                <Button
                  size="sm"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Now
                </Button>
              </a>
            </div>
          )}

          <div className="space-y-2.5 text-center pt-1">
            <p className="text-xs text-muted-foreground">
              Sign in to offer blood donation and track coordination directly.
            </p>
            <Link href={`/login?redirect=/requests/${id}`}>
              <Button
                size="lg"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Login to Offer Blood
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isProfileComplete) {
    return (
      <Card className="sticky top-24 shadow-sm">
        <CardHeader>
          <CardTitle>Can you help?</CardTitle>
          <CardDescription>Offer to donate blood for this request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contactPhone && (
            <div className="rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3.5 text-center space-y-2">
              <span className="text-xs text-muted-foreground font-medium block">
                Need to coordinate immediately?
              </span>
              <a
                href={`tel:${contactPhone}`}
                className="font-bold text-base text-red-600 dark:text-red-400 hover:underline flex items-center justify-center gap-1.5"
              >
                <Phone className="w-4 h-4" />
                {contactPhone}
              </a>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium text-center">
              Profile Information Required
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Please ensure your donor profile has your blood group and location
              before offering to donate.
            </p>
            <Link href={`/profile?redirect=/requests/${id}`}>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
              >
                Complete Donor Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasPhone) {
    return (
      <Card className="sticky top-24 shadow-sm">
        <CardHeader>
          <CardTitle>Can you help?</CardTitle>
          <CardDescription>Offer to donate blood for this request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Phone Number Required
            </p>
            <p className="text-xs text-muted-foreground">
              Please add a valid contact phone number to your profile so the
              requester can reach you immediately if they accept your offer.
            </p>
            <Link href={`/profile?redirect=/requests/${id}`}>
              <Button
                size="lg"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                Add Phone Number
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
