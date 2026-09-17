import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";
import {
  componentTypeLabels,
  requestStatusLabels,
  getLabel,
} from "@/lib/labels";
import type { BloodRequest } from "@repo/shared";

interface PatientMedicalDetailsCardProps {
  request: BloodRequest;
}

export function PatientMedicalDetailsCard({
  request,
}: PatientMedicalDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient & Medical Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {request.patient_name && (
            <div>
              <p className="text-sm text-muted-foreground">Patient Name</p>
              <p className="font-semibold text-base">{request.patient_name}</p>
            </div>
          )}
          {request.patient_age !== undefined && request.patient_age !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Patient Age</p>
              <p className="font-semibold text-base">{request.patient_age} years</p>
            </div>
          )}
          {request.disease && (
            <div>
              <p className="text-sm text-muted-foreground">Disease / Reason</p>
              <p className="font-semibold text-base text-red-600 dark:text-red-400">
                {request.disease}
              </p>
            </div>
          )}
          {request.needed_time && (
            <div>
              <p className="text-sm text-muted-foreground">Exact Time Needed</p>
              <p className="font-semibold text-base">
                {new Date(request.needed_time).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Component Type</p>
            <p className="font-medium">
              {getLabel(componentTypeLabels, request.component_type)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Units Needed</p>
            <p className="font-medium">
              {request.units_fulfilled} / {request.units_needed} bags
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Hospital & Area</p>
            <p className="font-medium">
              {request.hospital_name
                ? `${request.hospital_name} (${request.area_name})`
                : request.area_name}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Urgency Level</p>
            <div className="mt-1">
              {request.urgency === "CRITICAL" ? (
                <Badge variant="destructive" className="font-bold text-xs bg-red-600">
                  Critical (Immediate)
                </Badge>
              ) : request.urgency === "URGENT" ? (
                <Badge className="font-bold text-xs bg-amber-600 text-white">
                  Urgent (Within 24h)
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="font-semibold text-xs border-blue-300 text-blue-700 dark:text-blue-400"
                >
                  Normal
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">
              {getLabel(requestStatusLabels, request.status)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Patient / Attendant Contact</p>
            {request.contact_phone ? (
              <a
                href={`tel:${request.contact_phone}`}
                className="font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 mt-0.5"
              >
                <Phone className="w-3.5 h-3.5" />
                {request.contact_phone}
              </a>
            ) : (
              <p className="font-medium">Not provided</p>
            )}
          </div>
        </div>

        {request.patient_note && (
          <div className="mt-4 p-4 bg-muted/50 rounded-md border border-muted">
            <p className="text-sm font-medium mb-1 text-muted-foreground">
              Note from requester:
            </p>
            <p className="text-sm">{request.patient_note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
