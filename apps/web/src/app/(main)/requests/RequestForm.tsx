"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CardFooter,
} from "@/components/ui/card";
import { LocationPicker } from "@/components/LocationPicker";
import { apiClient, ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
  CalendarClock,
  User,
  Building2,
  Phone,
  Droplet,
} from "lucide-react";
import { BloodGroup, ComponentType, UrgencyLevel } from "@repo/shared";

export function RequestForm() {
  const router = useRouter();

  // Patient details
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [disease, setDisease] = useState("");
  const [neededTime, setNeededTime] = useState("");

  // Blood details
  const [bloodGroup, setBloodGroup] = useState<string>("O_POS");
  const [urgency, setUrgency] = useState<string>("NORMAL");
  const [componentType, setComponentType] = useState<string>("WHOLE_BLOOD");
  const [unitsNeeded, setUnitsNeeded] = useState("1");

  // Hospital & Location details
  const [hospitalName, setHospitalName] = useState("");
  const [areaName, setAreaName] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // Contact & Notes
  const [contactPhone, setContactPhone] = useState("");
  const [patientNote, setPatientNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLocationChange = (
    newLat: number,
    newLng: number,
    suggestedArea?: string,
  ) => {
    setLat(newLat);
    setLng(newLng);
    if (suggestedArea) {
      setAreaName(suggestedArea);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bloodGroup) {
      toast.error("Please select the required blood group");
      return;
    }

    if (!contactPhone.trim()) {
      toast.error("Please provide a contact phone number");
      return;
    }

    if (lat === null || lng === null) {
      toast.error("Please set the hospital / donation location pin on the map");
      return;
    }

    if (!areaName.trim()) {
      toast.error("Please provide the area or hospital locality name");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: {
        blood_group: BloodGroup;
        component_type: ComponentType;
        units_needed: number;
        urgency: UrgencyLevel;
        lat: number;
        lng: number;
        area_name: string;
        hospital_name?: string;
        patient_name?: string;
        patient_age?: number;
        disease?: string;
        needed_time?: string;
        contact_phone: string;
        patient_note?: string;
      } = {
        blood_group: bloodGroup as BloodGroup,
        component_type: componentType as ComponentType,
        units_needed: parseInt(unitsNeeded, 10) || 1,
        urgency: urgency as UrgencyLevel,
        lat: Number(lat),
        lng: Number(lng),
        area_name: areaName.trim(),
        hospital_name: hospitalName.trim() || undefined,
        patient_name: patientName.trim() || undefined,
        patient_age: patientAge ? parseInt(patientAge, 10) : undefined,
        disease: disease.trim() || undefined,
        needed_time: neededTime
          ? new Date(neededTime).toISOString()
          : undefined,
        contact_phone: contactPhone.trim(),
        patient_note: patientNote.trim() || undefined,
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
        toast.error(err.message || "Failed to create blood request");
      } else {
        toast.error("Failed to create blood request. Please check inputs.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-red-100 dark:border-red-900/30 shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 border-b border-red-100 dark:border-red-900/30 flex gap-3 items-start text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>Important Policy:</strong> Asking for or offering money for
            blood donation is strictly prohibited on Blood Aid. Any requests
            involving financial transactions will be removed and accounts may be
            banned.
          </p>
        </div>

        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <User className="w-5 h-5 text-red-600" />
            Patient & Medical Information
          </CardTitle>
          <CardDescription>
            Provide accurate details to help donors understand the medical
            urgency.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Patient Name, Age, Disease, Needed Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                name="patientName"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Mohammad Rahman"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="patientAge">Patient Age</Label>
              <Input
                id="patientAge"
                name="patientAge"
                type="number"
                min="0"
                max="120"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="e.g. 35"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="disease">Disease / Reason for Blood</Label>
              <Input
                id="disease"
                name="disease"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                placeholder="e.g. Thalassemia, Surgery, Accident, Anemia"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="neededTime" className="flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-red-600" />
                Exact Time When Needed
              </Label>
              <Input
                id="neededTime"
                name="neededTime"
                type="datetime-local"
                value={neededTime}
                onChange={(e) => setNeededTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Specify the exact date and time blood is required at the
                hospital.
              </p>
            </div>
          </div>

          {/* Blood & Urgency Details */}
          <div className="pt-2 border-t">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-red-600" />
              Blood Requirements
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bloodGroup">
                  Required Blood Group <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={bloodGroup}
                  onValueChange={(val: string | null) =>
                    val && setBloodGroup(val)
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
              </div>

              <div className="grid gap-2">
                <Label htmlFor="urgency">
                  Urgency Level <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={urgency}
                  onValueChange={(val: string | null) => val && setUrgency(val)}
                >
                  <SelectTrigger id="urgency">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL" label="Normal">
                      Normal
                    </SelectItem>
                    <SelectItem value="URGENT" label="Urgent (Within 24h)">
                      Urgent (Within 24h)
                    </SelectItem>
                    <SelectItem value="CRITICAL" label="Critical (Immediate)">
                      Critical (Immediate)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="componentType">Component Type</Label>
                <Select
                  value={componentType}
                  onValueChange={(val: string | null) =>
                    val && setComponentType(val)
                  }
                >
                  <SelectTrigger id="componentType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHOLE_BLOOD" label="Whole Blood">
                      Whole Blood
                    </SelectItem>
                    <SelectItem value="PLATELETS" label="Platelets">
                      Platelets
                    </SelectItem>
                    <SelectItem value="PLASMA" label="Plasma">
                      Plasma
                    </SelectItem>
                    <SelectItem value="RBC" label="Red Blood Cells (RBC)">
                      Red Blood Cells (RBC)
                    </SelectItem>
                    <SelectItem value="CRYO" label="Cryoprecipitate">
                      Cryoprecipitate
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="units">
                  Units / Bags Needed <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="units"
                  name="units"
                  type="number"
                  min="1"
                  max="50"
                  value={unitsNeeded}
                  onChange={(e) => setUnitsNeeded(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Hospital & Location */}
          <div className="pt-2 border-t space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-600" />
              Hospital & Location
            </h3>

            <div className="grid gap-2">
              <Label htmlFor="hospital">Hospital / Medical Center Name</Label>
              <Input
                id="hospital"
                name="hospital"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="e.g. Dhaka Medical College Hospital, Shahbagh"
              />
            </div>

            <LocationPicker
              lat={lat}
              lng={lng}
              areaName={areaName}
              onLocationChange={handleLocationChange}
              onAreaNameChange={(name) => setAreaName(name)}
              areaInputLabel="Hospital Locality / Area Name"
              areaInputPlaceholder="e.g. Shahbagh, Dhaka"
              required
            />
          </div>

          {/* Contact & Instructions */}
          <div className="pt-2 border-t space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5 text-red-600" />
              Contact & Additional Instructions
            </h3>

            <div className="grid gap-2">
              <Label htmlFor="phone">
                Contact Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+880 1XXXXXXXXX"
                required
              />
              <p className="text-xs text-muted-foreground">
                Will only be revealed to verified donors who accept this
                request.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">
                Patient Note / Special Instructions (Optional)
              </Label>
              <textarea
                id="note"
                name="note"
                rows={3}
                value={patientNote}
                onChange={(e) => setPatientNote(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g. Bed number, cabin number, attendent contact, specific requirements..."
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/30 pt-6">
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
            size="lg"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Blood Request...
              </>
            ) : (
              "Post Blood Request"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
