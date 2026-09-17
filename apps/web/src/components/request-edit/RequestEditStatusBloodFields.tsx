"use client";

import { Control, Controller, UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BloodGroup,
  ComponentType,
  UrgencyLevel,
  RequestStatus,
} from "@repo/shared";
import {
  bloodGroupLabels,
  componentTypeLabels,
  urgencyLabels,
  requestStatusLabels,
  getLabel,
} from "@/lib/labels";

export interface FormValues {
  blood_group: BloodGroup;
  component_type: ComponentType;
  units_needed: number;
  units_fulfilled: number;
  urgency: UrgencyLevel;
  status: RequestStatus;
  patient_name: string;
  patient_age: string;
  disease: string;
  needed_time: string;
  hospital_name: string;
  area_name: string;
  lat: number | null;
  lng: number | null;
  contact_phone: string;
  patient_note: string;
}

interface RequestEditStatusBloodFieldsProps {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}

export function RequestEditStatusBloodFields({
  control,
  register,
}: RequestEditStatusBloodFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-muted/40 rounded-xl border">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Status
          </Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(val: string | null) =>
                  val && field.onChange(val as RequestStatus)
                }
              >
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RequestStatus).map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      label={getLabel(requestStatusLabels, s)}
                    >
                      {getLabel(requestStatusLabels, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Blood Group *
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
                <SelectTrigger className="h-9 bg-background font-bold text-red-600 dark:text-red-400">
                  <SelectValue placeholder="Select Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(BloodGroup).map((bg) => (
                    <SelectItem
                      key={bg}
                      value={bg}
                      label={getLabel(bloodGroupLabels, bg)}
                    >
                      {getLabel(bloodGroupLabels, bg)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Urgency Level
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
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Select Urgency" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UrgencyLevel).map((u) => (
                    <SelectItem
                      key={u}
                      value={u}
                      label={getLabel(urgencyLabels, u)}
                    >
                      {getLabel(urgencyLabels, u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Component Type
          </Label>
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
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Component Type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ComponentType).map((ct) => (
                    <SelectItem
                      key={ct}
                      value={ct}
                      label={getLabel(componentTypeLabels, ct)}
                    >
                      {getLabel(componentTypeLabels, ct)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Units Needed *
          </Label>
          <Input
            type="number"
            min="1"
            {...register("units_needed", { valueAsNumber: true })}
            className="h-9 bg-background"
            required
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Units Fulfilled
          </Label>
          <Input
            type="number"
            min="0"
            {...register("units_fulfilled", { valueAsNumber: true })}
            className="h-9 bg-background"
          />
        </div>
      </div>
    </>
  );
}
