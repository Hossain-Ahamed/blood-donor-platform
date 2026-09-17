"use client";

import { Control, Controller, UseFormRegister } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Droplet } from "lucide-react";
import { BloodGroup, ComponentType, UrgencyLevel } from "@repo/shared";

export interface RequestFormValues {
  blood_group: BloodGroup;
  component_type: ComponentType;
  units_needed: number;
  urgency: UrgencyLevel;
  lat: number | null;
  lng: number | null;
  area_name: string;
  hospital_name: string;
  patient_name: string;
  patient_age: string;
  disease: string;
  needed_time: string;
  contact_phone: string;
  patient_note: string;
}

interface RequestFormBloodSectionProps {
  control: Control<RequestFormValues>;
  register: UseFormRegister<RequestFormValues>;
}

export function RequestFormBloodSection({
  control,
  register,
}: RequestFormBloodSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplet className="w-5 h-5 text-red-600 fill-red-600" />
          Blood Requirement
        </CardTitle>
        <CardDescription>
          Specify the blood group and urgency needed for the patient.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bloodGroup">
              Blood Group Needed <span className="text-red-500">*</span>
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
                  <SelectTrigger id="bloodGroup" className="font-bold text-red-600">
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
            <Label htmlFor="urgency">
              Urgency Level <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="urgency"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val: string | null) =>
                    val && field.onChange(val as UrgencyLevel)
                  }
                >
                  <SelectTrigger id="urgency">
                    <SelectValue placeholder="Select Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL" label="Normal (Within a few days)">
                      Normal (Within a few days)
                    </SelectItem>
                    <SelectItem value="URGENT" label="Urgent (Within 24 Hours)">
                      ⚡ Urgent (Within 24 Hours)
                    </SelectItem>
                    <SelectItem value="CRITICAL" label="Critical (Immediate / Emergency)">
                      🚨 Critical (Immediate / Emergency)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="componentType">Component Type</Label>
            <Controller
              name="component_type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val: string | null) =>
                    val && field.onChange(val as ComponentType)
                  }
                >
                  <SelectTrigger id="componentType">
                    <SelectValue placeholder="Select Component" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHOLE_BLOOD" label="Whole Blood">Whole Blood</SelectItem>
                    <SelectItem value="RBC" label="Red Blood Cells (PRBC)">Red Blood Cells (PRBC)</SelectItem>
                    <SelectItem value="PLATELETS" label="Platelets">Platelets</SelectItem>
                    <SelectItem value="PLASMA" label="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</SelectItem>
                    <SelectItem value="CRYOPRECIPITATE" label="Cryoprecipitate">Cryoprecipitate</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="unitsNeeded">
              Units (Bags) Needed <span className="text-red-500">*</span>
            </Label>
            <Input
              id="unitsNeeded"
              type="number"
              min="1"
              max="20"
              {...register("units_needed", { valueAsNumber: true })}
              required
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
