"use client";

import { UseFormRegister } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone } from "lucide-react";
import type { RequestFormValues } from "./RequestFormBloodSection";

interface RequestFormPatientSectionProps {
  register: UseFormRegister<RequestFormValues>;
}

export function RequestFormPatientSection({
  register,
}: RequestFormPatientSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-red-600" />
          Patient & Medical Details
        </CardTitle>
        <CardDescription>
          Information to help potential donors prepare and connect with the patient.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input
              id="patientName"
              {...register("patient_name")}
              placeholder="e.g. Rahim Ali"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="patientAge">Patient Age</Label>
            <Input
              id="patientAge"
              type="number"
              min="0"
              max="120"
              {...register("patient_age")}
              placeholder="e.g. 45"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="disease">Disease / Reason for Blood</Label>
            <Input
              id="disease"
              {...register("disease")}
              placeholder="e.g. Thalassemia, Open Heart Surgery, Accident"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="neededTime">Exact Time Needed (Optional)</Label>
            <Input
              id="neededTime"
              type="datetime-local"
              {...register("needed_time")}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contactPhone">
            Patient Attendant / Emergency Contact Phone{" "}
            <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="contactPhone"
              type="tel"
              className="pl-9"
              {...register("contact_phone")}
              placeholder="e.g. 01712345678 or +8801712345678"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            This number will be displayed to volunteer donors to coordinate donation.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="patientNote">Additional Notes / Instructions (Optional)</Label>
          <textarea
            id="patientNote"
            rows={3}
            {...register("patient_note")}
            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. Please bring donor card, meet at 4th floor Blood Bank..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
