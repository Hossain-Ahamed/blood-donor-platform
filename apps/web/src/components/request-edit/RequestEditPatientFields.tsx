"use client";

import { UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { FormValues } from "./RequestEditStatusBloodFields";

interface RequestEditPatientFieldsProps {
  register: UseFormRegister<FormValues>;
}

export function RequestEditPatientFields({
  register,
}: RequestEditPatientFieldsProps) {
  return (
    <>
      <div className="p-3 bg-muted/40 rounded-xl border space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Patient & Medical Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Patient Name
            </Label>
            <Input
              {...register("patient_name")}
              placeholder="e.g. Rahim Ali"
              className="h-9 bg-background text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Patient Age
            </Label>
            <Input
              type="number"
              min="0"
              max="120"
              {...register("patient_age")}
              placeholder="e.g. 45"
              className="h-9 bg-background text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Disease / Reason
            </Label>
            <Input
              {...register("disease")}
              placeholder="e.g. Thalassemia, Surgery"
              className="h-9 bg-background text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Needed Time / Deadline
            </Label>
            <Input
              type="datetime-local"
              {...register("needed_time")}
              className="h-9 bg-background text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Contact Phone *
            </Label>
            <Input
              type="tel"
              {...register("contact_phone")}
              placeholder="e.g. +880 1712 345678"
              className="h-9 bg-background text-sm"
              required
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
          Patient Note / Additional Instructions
        </Label>
        <Input
          {...register("patient_note")}
          placeholder="Any specific notes or directions for potential donors..."
          className="h-10 bg-background text-sm"
        />
      </div>
    </>
  );
}
