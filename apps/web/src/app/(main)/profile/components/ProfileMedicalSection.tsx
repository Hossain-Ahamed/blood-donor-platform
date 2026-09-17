"use client";

import { Control, Controller, UseFormRegister } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeartHandshake, ShieldAlert } from "lucide-react";
import { BloodGroup } from "@repo/shared";
import type { ProfileFormValues } from "./ProfilePersonalSection";

interface ProfileMedicalSectionProps {
  register: UseFormRegister<ProfileFormValues>;
  control: Control<ProfileFormValues>;
}

export function ProfileMedicalSection({
  register,
  control,
}: ProfileMedicalSectionProps) {
  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-red-600" />
          Medical & Donation Details
        </CardTitle>
        <CardDescription>
          Update your blood group, cooldown date, and health history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bloodGroup">
              Blood Group <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="blood_group"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val: string | null) =>
                    val && field.onChange(val as BloodGroup)
                  }
                >
                  <SelectTrigger id="bloodGroup">
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A_POS" label="A+">A+</SelectItem>
                    <SelectItem value="A_NEG" label="A-">A-</SelectItem>
                    <SelectItem value="B_POS" label="B+">B+</SelectItem>
                    <SelectItem value="B_NEG" label="B-">B-</SelectItem>
                    <SelectItem value="O_POS" label="O+">O+</SelectItem>
                    <SelectItem value="O_NEG" label="O-">O-</SelectItem>
                    <SelectItem value="AB_POS" label="AB+">AB+</SelectItem>
                    <SelectItem value="AB_NEG" label="AB-">AB-</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lastDonation">Last Donation Date</Label>
            <Input
              id="lastDonation"
              type="date"
              {...register("last_donation_date")}
            />
            <p className="text-xs text-muted-foreground">
              Calculates your 90-day cooldown availability.
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="healthNotes" className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Health Notes & Medical History
          </Label>
          <textarea
            id="healthNotes"
            rows={3}
            {...register("health_notes")}
            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. Any allergies, past medical conditions, weight, medications..."
          />
          <p className="text-xs text-muted-foreground">
            Relevant medical info to help ensure safe donation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
