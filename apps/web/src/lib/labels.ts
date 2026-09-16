/**
 * Human-readable labels for enum values used throughout the app.
 * These maps convert internal API values (e.g. "WHOLE_BLOOD") to
 * user-friendly display text (e.g. "Whole Blood").
 */

export const bloodGroupLabels: Record<string, string> = {
  A_POS: "A+",
  A_NEG: "A-",
  B_POS: "B+",
  B_NEG: "B-",
  O_POS: "O+",
  O_NEG: "O-",
  AB_POS: "AB+",
  AB_NEG: "AB-",
  ALL: "All Groups",
  all: "All Groups",
};

export const urgencyLabels: Record<string, string> = {
  NORMAL: "Normal",
  URGENT: "Urgent (Within 24h)",
  CRITICAL: "Critical (Immediate)",
  all: "All Urgency",
};

export const componentTypeLabels: Record<string, string> = {
  WHOLE_BLOOD: "Whole Blood",
  PLATELETS: "Platelets",
  PLASMA: "Plasma",
  RBC: "Red Blood Cells (RBC)",
  PACKED_RBC: "Packed RBC",
  CRYO: "Cryoprecipitate",
  CRYOPRECIPITATE: "Cryoprecipitate",
  all: "All Types",
};

export const requestStatusLabels: Record<string, string> = {
  OPEN: "Open",
  PARTIALLY_FULFILLED: "Partially Fulfilled",
  FULFILLED: "Fulfilled",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  ACTIVE: "Active",
  all: "All Statuses",
};

export const responseStatusLabels: Record<string, string> = {
  OFFERED: "Offered",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

export const reportStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  DISMISSED: "Dismissed",
  ACTIONED: "Actioned",
};

export const userRoleLabels: Record<string, string> = {
  USER: "User",
  ADMIN: "Admin",
};

export const allLabels: Record<string, string> = {
  ...bloodGroupLabels,
  ...urgencyLabels,
  ...componentTypeLabels,
  ...requestStatusLabels,
  ...responseStatusLabels,
  ...reportStatusLabels,
  ...userRoleLabels,
};

/**
 * Format any value for display:
 * 1. Checks specific or merged dictionary
 * 2. Formats SNAKE_CASE to Title Case
 */
export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value);
  if (allLabels[str]) return allLabels[str];

  // If already formatted or simple string without underscore and not all-uppercase, return as is
  if (!str.includes("_") && str !== str.toUpperCase()) {
    return str;
  }

  // Convert SNAKE_CASE to Title Case (e.g., "WHOLE_BLOOD" -> "Whole Blood")
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generic helper to look up a label from a map, falling back to
 * formatDisplayValue if no mapping exists.
 */
export function getLabel(
  map: Record<string, string>,
  value: string | undefined | null,
): string {
  if (!value) return "";
  return map[value] ?? formatDisplayValue(value);
}
