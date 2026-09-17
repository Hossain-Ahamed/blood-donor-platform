import { Clock } from "lucide-react";

interface DonorCooldownAlertProps {
  daysRemaining: number;
  formattedLastDonation: string;
  eligibleDate: Date | null;
}

export function DonorCooldownAlert({
  daysRemaining,
  formattedLastDonation,
  eligibleDate,
}: DonorCooldownAlertProps) {
  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/30 p-3.5 space-y-2">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Medical Cooldown Active ({daysRemaining} days left)</span>
      </div>
      <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
        Your last blood donation was on <strong>{formattedLastDonation}</strong>.
        For medical safety, a 90-day rest interval is required before donating again.
        You will be eligible to donate on{" "}
        <strong>{eligibleDate?.toLocaleDateString(undefined, { dateStyle: "medium" })}</strong>.
      </p>
    </div>
  );
}
