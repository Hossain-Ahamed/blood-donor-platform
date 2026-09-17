"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
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
import {
  Loader2,
  HeartHandshake,
  User,
  ShieldAlert,
  Calendar,
  Sparkles,
  Phone,
} from "lucide-react";
import type { DonorProfile, User as UserType, BloodGroup } from "@repo/shared";

type ProfileFormProps = {
  initialData?: (DonorProfile & { user?: UserType }) | null;
  initialUser?: UserType | null;
};

interface ProfileFormValues {
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
  const {
    isSupported,
    isSubscribed,
    loading: pushLoading,
    subscribeToPush,
  } = usePushNotifications();

  // Date of Birth initial value
  const rawDob = initialData?.date_of_birth;
  const initialDob = rawDob ? new Date(rawDob).toISOString().split("T")[0] : "";

  // Location initial values
  const loc = initialData?.location as
    { lat?: number; lng?: number; coordinates?: [number, number] } | undefined;
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
      phone: initialData?.user?.phone || initialUser?.phone || "",
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

      await apiClient.request("/donor-profiles", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Profile updated successfully!");
      router.refresh();
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
          {/* Personal Information */}
          <Card className="shadow-sm border-zinc-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-red-600" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your personal and demographic details.
              </CardDescription>
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
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  Contact Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="e.g. +880 1700 000000 or 01700000000"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Required for emergency blood request coordination and donor contact.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date of Birth & Auto Age Calculation */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="dateOfBirth"
                      className="flex items-center gap-1"
                    >
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
                        onValueChange={(val: string | null) =>
                          field.onChange(val || "")
                        }
                      >
                        <SelectTrigger id="religion">
                          <SelectValue placeholder="Select Religion (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Islam" label="Islam">
                            Islam
                          </SelectItem>
                          <SelectItem value="Hinduism" label="Hinduism">
                            Hinduism
                          </SelectItem>
                          <SelectItem value="Christianity" label="Christianity">
                            Christianity
                          </SelectItem>
                          <SelectItem value="Buddhism" label="Buddhism">
                            Buddhism
                          </SelectItem>
                          <SelectItem value="Other" label="Other">
                            Other
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical & Blood Details */}
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
                          <SelectItem value="A_POS" label="A+">
                            A+
                          </SelectItem>
                          <SelectItem value="A_NEG" label="A-">
                            A-
                          </SelectItem>
                          <SelectItem value="B_POS" label="B+">
                            B+
                          </SelectItem>
                          <SelectItem value="B_NEG" label="B-">
                            B-
                          </SelectItem>
                          <SelectItem value="O_POS" label="O+">
                            O+
                          </SelectItem>
                          <SelectItem value="O_NEG" label="O-">
                            O-
                          </SelectItem>
                          <SelectItem value="AB_POS" label="AB+">
                            AB+
                          </SelectItem>
                          <SelectItem value="AB_NEG" label="AB-">
                            AB-
                          </SelectItem>
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
                <Label
                  htmlFor="healthNotes"
                  className="flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Health Notes & Medical History
                </Label>
                <textarea
                  id="healthNotes"
                  rows={3}
                  {...register("health_notes")}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. Any allergies, past medical conditions, weight, medications..."
                />
                <p className="text-xs text-muted-foreground">
                  Relevant medical info to help ensure safe donation.
                </p>
              </div>
            </CardContent>
          </Card>

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
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
        <Card className="shadow-sm border-zinc-200">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Get alerted immediately when someone needs your blood group
              nearby.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSupported ? (
              <p className="text-sm text-muted-foreground">
                Push notifications not supported in this browser.
              </p>
            ) : pushLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking push status...
              </div>
            ) : isSubscribed ? (
              <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Notifications Active
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enable push notifications to receive urgent blood donation
                  requests.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900"
                  onClick={subscribeToPush}
                >
                  Enable Notifications
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
