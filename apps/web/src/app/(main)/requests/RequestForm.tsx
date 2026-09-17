"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { LocationPicker } from "@/components/LocationPicker";
import { apiClient, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { AlertCircle, Loader2, Building2 } from "lucide-react";
import { BloodGroup, ComponentType, UrgencyLevel } from "@repo/shared";
import {
  RequestFormBloodSection,
  type RequestFormValues,
} from "./components/RequestFormBloodSection";
import { RequestFormPatientSection } from "./components/RequestFormPatientSection";

interface RequestFormProps {
  initialPhone?: string;
}

export function RequestForm({ initialPhone = "" }: RequestFormProps = {}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<RequestFormValues>({
    defaultValues: {
      blood_group: BloodGroup.O_POS,
      component_type: ComponentType.WHOLE_BLOOD,
      units_needed: 1,
      urgency: UrgencyLevel.NORMAL,
      lat: null,
      lng: null,
      area_name: "",
      hospital_name: "",
      patient_name: "",
      patient_age: "",
      disease: "",
      needed_time: "",
      contact_phone: initialPhone || "",
      patient_note: "",
    },
  });

  const lat = useWatch({ control, name: "lat" });
  const lng = useWatch({ control, name: "lng" });
  const areaName = useWatch({ control, name: "area_name" });

  const onSubmit = async (data: RequestFormValues) => {
    if (!data.blood_group) {
      toast.error("Please select the required blood group");
      return;
    }
    if (!data.contact_phone.trim()) {
      toast.error("Please provide a contact phone number");
      return;
    }
    if (data.lat === null || data.lng === null) {
      toast.error("Please set the hospital / donation location pin on the map");
      return;
    }
    if (!data.area_name.trim()) {
      toast.error("Please provide the area or hospital locality name");
      return;
    }

    const units = Number(data.units_needed) || 1;

    try {
      const payload: Record<string, unknown> = {
        blood_group: data.blood_group,
        component_type: data.component_type,
        units_needed: units,
        urgency: data.urgency,
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

      const res = await apiClient.request<
        { id: string } | { data: { id: string } }
      >("/requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Blood request created successfully!");
      const newRequestId = "id" in res ? res.id : res.data?.id;
      if (newRequestId) {
        router.push(`/requests/${newRequestId}`);
      } else {
        router.push("/browse");
      }
    } catch (err) {
      console.error("Create request error:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to create request");
      } else {
        toast.error("Failed to create request. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <RequestFormBloodSection control={control} register={register} />
      <RequestFormPatientSection register={register} />

      {/* Hospital & Location Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600" />
            Hospital & Location Details
          </CardTitle>
          <CardDescription>
            Pinpoint the hospital on the map so nearby registered donors receive
            instant alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="hospitalName">
              Hospital / Clinic Name (Optional)
            </Label>
            <Input
              id="hospitalName"
              {...register("hospital_name")}
              placeholder="e.g. Dhaka Medical College Hospital (DMCH)"
            />
          </div>

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
            onAreaNameChange={(name) => setValue("area_name", name)}
            areaInputLabel="Area / Locality Name"
            areaInputPlaceholder="e.g. Bakshibazar, Dhaka"
            required
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 text-base shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Publishing Request...
              </>
            ) : (
              "Submit Emergency Blood Request"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            Registered donors of matching blood group nearby will be notified.
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
