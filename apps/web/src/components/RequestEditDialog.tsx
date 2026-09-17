"use client";

import { useForm, useWatch } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/LocationPicker";
import { apiClient, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import {
  BloodGroup,
  ComponentType,
  UrgencyLevel,
  RequestStatus,
} from "@repo/shared";
import { Loader2, Save } from "lucide-react";
import {
  RequestEditStatusBloodFields,
  type FormValues,
} from "./request-edit/RequestEditStatusBloodFields";
import { RequestEditPatientFields } from "./request-edit/RequestEditPatientFields";

export interface RequestEditDialogProps {
  request: {
    id: string;
    blood_group: string;
    component_type?: string | null;
    units_needed: number;
    units_fulfilled?: number | null;
    urgency?: string | null;
    status?: string | null;
    area_name: string;
    hospital_name?: string | null;
    patient_name?: string | null;
    patient_age?: number | null;
    disease?: string | null;
    needed_time?: string | Date | null;
    contact_phone?: string | null;
    patient_note?: string | null;
    location?: { type?: string; coordinates?: [number, number] } | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: unknown) => void;
  isAdmin?: boolean;
}

function RequestEditForm({
  request,
  onClose,
  onSuccess,
  isAdmin = false,
}: {
  request: NonNullable<RequestEditDialogProps["request"]>;
  onClose: () => void;
  onSuccess: (updated: unknown) => void;
  isAdmin?: boolean;
}) {
  const getInitialNeededTime = () => {
    if (!request.needed_time) return "";
    try {
      const d = new Date(request.needed_time);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    } catch {
      return "";
    }
  };

  const initialCoordinates =
    request.location?.coordinates &&
    Array.isArray(request.location.coordinates) &&
    request.location.coordinates.length === 2
      ? request.location.coordinates
      : null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      blood_group: (request.blood_group as BloodGroup) || BloodGroup.O_POS,
      component_type:
        (request.component_type as ComponentType) || ComponentType.WHOLE_BLOOD,
      units_needed: request.units_needed || 1,
      units_fulfilled: request.units_fulfilled ?? 0,
      urgency: (request.urgency as UrgencyLevel) || UrgencyLevel.NORMAL,
      status: (request.status as RequestStatus) || RequestStatus.OPEN,
      patient_name: request.patient_name || "",
      patient_age:
        request.patient_age !== undefined && request.patient_age !== null
          ? request.patient_age.toString()
          : "",
      disease: request.disease || "",
      needed_time: getInitialNeededTime(),
      hospital_name: request.hospital_name || "",
      area_name: request.area_name || "",
      lat: initialCoordinates ? initialCoordinates[1] : null,
      lng: initialCoordinates ? initialCoordinates[0] : null,
      contact_phone: request.contact_phone || "",
      patient_note: request.patient_note || "",
    },
  });

  const lat = useWatch({ control, name: "lat" });
  const lng = useWatch({ control, name: "lng" });
  const areaName = useWatch({ control, name: "area_name" });

  const onSubmit = async (data: FormValues) => {
    if (!data.blood_group) {
      toast.error("Please select a blood group");
      return;
    }
    if (!data.contact_phone.trim()) {
      toast.error("Contact phone number is required");
      return;
    }
    if (!data.area_name.trim()) {
      toast.error("Area or locality name is required");
      return;
    }
    if (data.lat === null || data.lng === null) {
      toast.error("Please select the hospital / location pin on the map");
      return;
    }
    if (data.units_needed < 1) {
      toast.error("Units needed must be at least 1");
      return;
    }
    if (data.units_fulfilled < 0) {
      toast.error("Units fulfilled cannot be negative");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        blood_group: data.blood_group,
        component_type: data.component_type,
        units_needed: Number(data.units_needed),
        units_fulfilled: Number(data.units_fulfilled),
        urgency: data.urgency,
        status: data.status,
        lat: Number(data.lat),
        lng: Number(data.lng),
        area_name: data.area_name.trim(),
        hospital_name: data.hospital_name.trim() || undefined,
        patient_name: data.patient_name.trim() || undefined,
        patient_age: data.patient_age
          ? parseInt(data.patient_age, 10)
          : undefined,
        disease: data.disease.trim() || undefined,
        needed_time: data.needed_time
          ? new Date(data.needed_time).toISOString()
          : undefined,
        contact_phone: data.contact_phone.trim(),
        patient_note: data.patient_note.trim() || undefined,
      };

      const endpoint = isAdmin
        ? `/admin/requests/${request.id}`
        : `/requests/${request.id}`;

      const res = await apiClient.request<unknown>(endpoint, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast.success("Blood request updated successfully!");
      onSuccess(res);
      onClose();
    } catch (err) {
      console.error("Failed to update request:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to update request");
      } else {
        toast.error("Failed to update blood request. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
      <RequestEditStatusBloodFields control={control} register={register} />
      <RequestEditPatientFields register={register} />

      {/* Hospital & Location */}
      <div className="p-3 bg-muted/40 rounded-xl border space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Hospital & Location
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Hospital / Clinic Name
            </Label>
            <Input
              {...register("hospital_name")}
              placeholder="e.g. Dhaka Medical College Hospital"
              className="h-9 bg-background text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Area / Locality Name *
            </Label>
            <Input
              {...register("area_name")}
              placeholder="e.g. Bakshibazar, Dhaka"
              className="h-9 bg-background text-sm"
              required
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Update Pin Location on Map
          </Label>
          <LocationPicker
            lat={lat}
            lng={lng}
            areaName={areaName}
            onLocationChange={(newLat, newLng, suggestedArea) => {
              setValue("lat", newLat);
              setValue("lng", newLng);
              if (suggestedArea) {
                setValue("area_name", suggestedArea);
              }
            }}
            onAreaNameChange={(newArea) => setValue("area_name", newArea)}
            showAreaInput={false}
          />
        </div>
      </div>

      <DialogFooter className="pt-3 border-t flex flex-row justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          ) : (
            <Save className="w-4 h-4 mr-1.5" />
          )}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RequestEditDialog({
  request,
  isOpen,
  onClose,
  onSuccess,
  isAdmin = false,
}: RequestEditDialogProps) {
  if (!isOpen || !request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span>Edit Blood Request</span>
          </DialogTitle>
          <DialogDescription>
            Update details, location, or status of this blood request.
          </DialogDescription>
        </DialogHeader>

        <RequestEditForm
          key={request.id}
          request={request}
          onClose={onClose}
          onSuccess={onSuccess}
          isAdmin={isAdmin}
        />
      </DialogContent>
    </Dialog>
  );
}
