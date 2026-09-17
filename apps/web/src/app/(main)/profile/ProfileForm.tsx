"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocationPicker } from "@/components/LocationPicker";
import { apiClient, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { DonorProfile, User as UserType, BloodGroup } from "@repo/shared";
import {
  ProfilePersonalSection,
  type ProfileFormValues,
} from "./components/ProfilePersonalSection";
import { ProfileMedicalSection } from "./components/ProfileMedicalSection";
import { ProfileNotificationsSidebar } from "./components/ProfileNotificationsSidebar";

type ProfileFormProps = {
  initialData?: (DonorProfile & { user?: UserType }) | null;
  initialUser?: UserType | null;
};

function calculateAge(dobString: string): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let calculated = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    calculated--;
  }
  return calculated >= 0 ? calculated : null;
}

export function ProfileForm({ initialData, initialUser }: ProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isSupported,
    isSubscribed,
    loading: pushLoading,
    subscribeToPush,
  } = usePushNotifications();

  const rawDob = initialData?.date_of_birth;
  const initialDob = rawDob ? new Date(rawDob).toISOString().split("T")[0] : "";

  const loc = initialData?.location as
    | { lat?: number; lng?: number; coordinates?: [number, number] }
    | undefined;
  const initialLat =
    loc?.lat ??
    (Array.isArray(loc?.coordinates) && loc.coordinates.length === 2
      ? loc.coordinates[1]
      : null);
  const initialLng =
    loc?.lng ??
    (Array.isArray(loc?.coordinates) && loc.coordinates.length === 2
      ? loc.coordinates[0]
      : null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: initialData?.user?.name || initialUser?.name || "",
      phone: initialUser?.phone || initialData?.user?.phone || "",
      blood_group:
        (initialData?.blood_group as BloodGroup) || ("O_POS" as BloodGroup),
      date_of_birth: initialDob,
      religion: initialData?.religion || "",
      health_notes: initialData?.health_notes || "",
      last_donation_date: initialData?.last_donation_date
        ? new Date(initialData.last_donation_date).toISOString().split("T")[0]
        : "",
      bio: initialData?.bio || "",
      lat: initialLat,
      lng: initialLng,
      area_name: initialData?.area_name || "",
    },
  });

  const dateOfBirth = useWatch({ control, name: "date_of_birth" });
  const lat = useWatch({ control, name: "lat" });
  const lng = useWatch({ control, name: "lng" });
  const areaName = useWatch({ control, name: "area_name" });

  const computedAge =
    calculateAge(dateOfBirth) ??
    (initialData?.age ? Number(initialData.age) : null);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!data.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!data.phone.trim()) {
      toast.error("Please enter your contact phone number");
      return;
    }
    if (data.lat === null || data.lng === null) {
      toast.error("Please select your location on the map or use GPS");
      return;
    }
    if (!data.area_name.trim()) {
      toast.error("Please enter your area or locality name");
      return;
    }
    if (computedAge !== null && computedAge < 16) {
      toast.error("Donors must be at least 16 years old to register");
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        blood_group: data.blood_group,
        lat: Number(data.lat),
        lng: Number(data.lng),
        area_name: data.area_name.trim(),
        date_of_birth: data.date_of_birth || undefined,
        age: computedAge ?? undefined,
        religion: data.religion.trim() || undefined,
        health_notes: data.health_notes.trim() || undefined,
        bio: data.bio.trim() || undefined,
        last_donation_date: data.last_donation_date || undefined,
      };

      await Promise.all([
        apiClient.request("/donor-profiles", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        apiClient.request("/users/me", {
          method: "PATCH",
          body: JSON.stringify({
            name: data.name.trim(),
            phone: data.phone.trim(),
          }),
        }),
      ]);

      toast.success("Profile updated successfully!");
      const redirectUrl = searchParams.get("redirect");
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Save profile error:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to update profile");
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <ProfilePersonalSection
            register={register}
            control={control}
            computedAge={computedAge}
          />

          <ProfileMedicalSection register={register} control={control} />

          {/* Location & Bio */}
          <Card className="shadow-sm border-zinc-200">
            <CardHeader>
              <CardTitle>Location & Bio</CardTitle>
              <CardDescription>
                Where are you located to receive requests from people nearby?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                areaInputLabel="Your Area / Neighborhood"
                areaInputPlaceholder="e.g. Uttara Sector 4, Dhaka"
                required
              />

              <div className="grid gap-2 pt-2">
                <Label htmlFor="bio">Short Bio (Optional)</Label>
                <textarea
                  id="bio"
                  rows={2}
                  {...register("bio")}
                  className="flex min-h-17.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Additional notes about your availability or preferred times..."
                />
              </div>

              <Button
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                type="submit"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* Notifications Sidebar */}
      <div className="space-y-6">
        <ProfileNotificationsSidebar
          isSupported={isSupported}
          pushLoading={pushLoading}
          isSubscribed={isSubscribed}
          onSubscribe={subscribeToPush}
        />
      </div>
    </div>
  );
}
