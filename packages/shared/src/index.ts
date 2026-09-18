import { z } from "zod";

// 1. Enums
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum BloodGroup {
  A_POS = "A_POS",
  A_NEG = "A_NEG",
  B_POS = "B_POS",
  B_NEG = "B_NEG",
  AB_POS = "AB_POS",
  AB_NEG = "AB_NEG",
  O_POS = "O_POS",
  O_NEG = "O_NEG",
}

export enum ComponentType {
  WHOLE_BLOOD = "WHOLE_BLOOD",
  PLATELETS = "PLATELETS",
  PLASMA = "PLASMA",
  RBC = "RBC",
  CRYO = "CRYO",
}

export enum UrgencyLevel {
  CRITICAL = "CRITICAL",
  URGENT = "URGENT",
  NORMAL = "NORMAL",
}

export enum RequestStatus {
  OPEN = "OPEN",
  PARTIALLY_FULFILLED = "PARTIALLY_FULFILLED",
  FULFILLED = "FULFILLED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum ResponseStatus {
  OFFERED = "OFFERED",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  CANCELLED = "CANCELLED",
}

export enum ReportTargetType {
  USER = "USER",
  REQUEST = "REQUEST",
}

export enum ReportStatus {
  PENDING = "PENDING",
  REVIEWED = "REVIEWED",
  DISMISSED = "DISMISSED",
  ACTIONED = "ACTIONED",
}

// 2. Zod Schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  google_id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar_url: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const DonorProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  blood_group: z.nativeEnum(BloodGroup),
  // Geolocation point can be represented as [longitude, latitude] or an object
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  area_name: z.string(),
  date_of_birth: z.union([z.date(), z.string()]).nullable().optional(),
  age: z.number().int().positive().nullable().optional(),
  religion: z.string().nullable().optional(),
  health_notes: z.string().nullable().optional(),
  last_donation_date: z.union([z.date(), z.string()]).nullable().optional(),
  is_available: z.boolean().default(true),
  bio: z.string().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type DonorProfile = z.infer<typeof DonorProfileSchema>;

export const BloodRequestSchema = z.object({
  id: z.string().uuid(),
  requester_id: z.string().uuid(),
  blood_group: z.nativeEnum(BloodGroup),
  component_type: z
    .nativeEnum(ComponentType)
    .default(ComponentType.WHOLE_BLOOD),
  units_needed: z.number().int().positive().default(1),
  units_fulfilled: z.number().int().nonnegative().default(0),
  urgency: z.nativeEnum(UrgencyLevel).default(UrgencyLevel.NORMAL),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  area_name: z.string(),
  hospital_name: z.string().nullable().optional(),
  patient_name: z.string().nullable().optional(),
  patient_age: z.number().int().positive().nullable().optional(),
  disease: z.string().nullable().optional(),
  needed_time: z.union([z.date(), z.string()]).nullable().optional(),
  patient_note: z.string().nullable().optional(),
  contact_phone: z.string(),
  status: z.nativeEnum(RequestStatus).default(RequestStatus.OPEN),
  expires_at: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable().optional(),
  requester: UserSchema.partial().nullable().optional(),
});
export type BloodRequest = z.infer<typeof BloodRequestSchema>;

export const ResponseSchema = z.object({
  id: z.string().uuid(),
  request_id: z.string().uuid(),
  donor_id: z.string().uuid(),
  status: z.nativeEnum(ResponseStatus).default(ResponseStatus.OFFERED),
  message: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Response = z.infer<typeof ResponseSchema>;

export const DonationSchema = z.object({
  id: z.string().uuid(),
  response_id: z.string().uuid(),
  donation_date: z.date(),
  confirmed_by_donor: z.boolean().default(false),
  confirmed_by_requester: z.boolean().default(false),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Donation = z.infer<typeof DonationSchema>;

export const ReportSchema = z.object({
  id: z.string().uuid(),
  reporter_id: z.string().uuid(),
  target_type: z.nativeEnum(ReportTargetType),
  target_id: z.string().uuid(),
  reason: z.string(),
  status: z.nativeEnum(ReportStatus).default(ReportStatus.PENDING),
  reviewed_by: z.string().uuid().nullable().optional(),
  created_at: z.date(),
  reviewed_at: z.date().nullable().optional(),
});
export type Report = z.infer<typeof ReportSchema>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  admin_id: z.string().uuid(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string().uuid(),
  meta: z.record(z.string(), z.any()).nullable().optional(),
  created_at: z.date(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

export interface TargetSummary {
  id: string;
  type: ReportTargetType | string;
  label: string;
  details?: string | null;
  status?: string | null;
  extra?: Record<string, any> | null;
}

export interface EnrichedReport extends Report {
  reporter?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
  target?: TargetSummary | null;
}

export interface EnrichedAuditLog extends AuditLog {
  admin?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    role: UserRole;
  } | null;
  target?: TargetSummary | null;
}

export function formatBloodGroup(bg?: string | null): string {
  if (!bg) return "";
  const trimmed = bg.trim();
  const normalized = trimmed.toUpperCase();
  const map: Record<string, string> = {
    A_POS: "A+",
    A_NEG: "A-",
    B_POS: "B+",
    B_NEG: "B-",
    AB_POS: "AB+",
    AB_NEG: "AB-",
    O_POS: "O+",
    O_NEG: "O-",
    "A+": "A+",
    "A-": "A-",
    "B+": "B+",
    "B-": "B-",
    "AB+": "AB+",
    "AB-": "AB-",
    "O+": "O+",
    "O-": "O-",
  };
  return map[normalized] || map[trimmed] || trimmed;
}

export function toHumanReadable(str?: string | null): string {
  if (!str) return "";
  let res = str
    // 1. Replace blood groups like O_POS, o_pos, AB_NEG, a_neg to O+, AB-, A-, etc.
    .replace(/\b(A|B|AB|O)_(POS|NEG)\b/gi, (_, group, sign) => {
      return `${group.toUpperCase()}${sign.toUpperCase() === "POS" ? "+" : "-"}`;
    })
    // 2. Fix unit pluralization like "1 units" -> "1 unit"
    .replace(/\b(\d+)\s+units\b/gi, (match, count) => {
      return count === "1" ? "1 unit" : `${count} units`;
    });

  // 3. Format common system enums
  const enumMap: Record<string, string> = {
    WHOLE_BLOOD: "Whole Blood",
    PLATELETS: "Platelets",
    PLASMA: "Plasma",
    CRYO: "Cryoprecipitate",
    CRITICAL: "Critical",
    URGENT: "Urgent",
    NORMAL: "Normal",
    PARTIALLY_FULFILLED: "Partially Fulfilled",
    FULFILLED: "Fulfilled",
    CANCELLED: "Cancelled",
  };

  for (const [key, val] of Object.entries(enumMap)) {
    res = res.replace(new RegExp(`\\b${key}\\b`, "g"), val);
  }

  return res;
}

