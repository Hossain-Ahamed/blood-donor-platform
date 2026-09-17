import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ExternalLink } from "lucide-react";

interface HospitalLocationCardProps {
  hospitalName?: string | null;
  areaName: string;
  coordinates?: [number, number] | null;
}

export function HospitalLocationCard({
  hospitalName,
  areaName,
  coordinates,
}: HospitalLocationCardProps) {
  const hasCoords = Boolean(
    coordinates &&
      Array.isArray(coordinates) &&
      typeof coordinates[0] === "number" &&
      typeof coordinates[1] === "number",
  );
  const [lng, lat] = hasCoords && coordinates ? coordinates : [0, 0];

  const googleDirectionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : "#";
  const googleSearchUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : "#";

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
            <MapPin className="w-5 h-5 text-red-600 shrink-0" />
            Hospital & Location Details
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {hospitalName ? `${hospitalName}, ${areaName}` : areaName}
          </CardDescription>
        </div>

        {hasCoords && (
          <div className="flex items-center gap-2">
            <a href={googleDirectionsUrl} target="_blank" rel="noopener noreferrer">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 h-8 px-3"
              >
                <Navigation className="w-3.5 h-3.5" />
                Get Directions
              </Button>
            </a>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-72 w-full rounded-xl overflow-hidden border shadow-inner bg-muted/20 relative">
          {hasCoords ? (
            <iframe
              title="Hospital Location on Google Maps"
              src={`https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
              Location coordinates not provided
            </div>
          )}
        </div>

        {hasCoords && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="font-medium text-foreground">
                {hospitalName || areaName}
              </span>
              <span>
                ({lat.toFixed(5)}, {lng.toFixed(5)})
              </span>
            </span>

            <div className="flex items-center gap-3">
              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 font-semibold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Google Maps
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
