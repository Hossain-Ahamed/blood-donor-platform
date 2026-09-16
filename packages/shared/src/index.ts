import { z } from 'zod';

// 1. Enums
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum BloodGroup {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
}

export enum ComponentType {
  WHOLE_BLOOD = 'WHOLE_BLOOD',
  PLATELETS = 'PLATELETS',
  PLASMA = 'PLASMA',
  RBC = 'RBC',
  CRYO = 'CRYO',
}

export enum UrgencyLevel {
  CRITICAL = 'CRITICAL',
  URGENT = 'URGENT',
  NORMAL = 'NORMAL',
}

export enum RequestStatus {
  OPEN = 'OPEN',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  FULFILLED = 'FULFILLED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ResponseStatus {
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export enum ReportTargetType {
  USER = 'USER',
  REQUEST = 'REQUEST',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
  ACTIONED = 'ACTIONED',
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
  component_type: z.nativeEnum(ComponentType).default(ComponentType.WHOLE_BLOOD),
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
});
export type BloodRequest = z.infer<typeof BloodRequestSchema>;

export const ResponseSchema = z.object({
  id: z.string().uuid(),
  request_id: z.string().uuid(),
  donor_id: z.string().uuid(),
  status: z.nativeEnum(ResponseStatus).default(ResponseStatus.OFFERED),
  message: z.string().nullable().optional(),
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

