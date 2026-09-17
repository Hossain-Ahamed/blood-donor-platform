"use client";

import { Control, Controller, UseFormRegister } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Phone, Calendar, Sparkles } from "lucide-react";
import type { BloodGroup } from "@repo/shared";

export interface ProfileFormValues {
  name: string;
  phone: string;
  blood_group: BloodGroup;
  date_of_birth: string;
  religion: string;
  health_notes: string;
  last_donation_date: string;
  bio: string;
  lat: number | null;
  lng: number | null;
  area_name: string;
}

interface ProfilePersonalSectionProps {
  register: UseFormRegister<ProfileFormValues>;
  control: Control<ProfileFormValues>;
  computedAge: number | null;
}

export function ProfilePersonalSection({
  register,
  control,
  computedAge,
}: ProfilePersonalSectionProps) {
  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-red-600" />
          Personal Information
        </CardTitle>
        <CardDescription>Your personal and demographic details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">
            Contact Phone Number <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              className="pl-9"
              {...register("phone")}
              placeholder="e.g. 01712345678 or +8801712345678"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Required for emergency blood requests and donor coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dateOfBirth" className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Date of Birth
              </Label>
              {computedAge !== null && (
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-red-500" />
                  Age: {computedAge} yrs
                </Badge>
              )}
            </div>
            <Input
              id="dateOfBirth"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              {...register("date_of_birth")}
            />
            <p className="text-[11px] text-muted-foreground">
              Age is automatically calculated from your birth date.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="religion">Religion</Label>
            <Controller
              name="religion"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val: string | null) => field.onChange(val || "")}
                >
                  <SelectTrigger id="religion">
                    <SelectValue placeholder="Select Religion (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Islam" label="Islam">Islam</SelectItem>
                    <SelectItem value="Hinduism" label="Hinduism">Hinduism</SelectItem>
                    <SelectItem value="Christianity" label="Christianity">Christianity</SelectItem>
                    <SelectItem value="Buddhism" label="Buddhism">Buddhism</SelectItem>
                    <SelectItem value="Other" label="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
