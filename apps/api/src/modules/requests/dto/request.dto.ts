import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import * as sanitizeHtml from "sanitize-html";
import {
  BloodGroup,
  ComponentType,
  UrgencyLevel,
  RequestStatus,
} from "@repo/shared";

export class CreateRequestDto {
  @IsEnum(BloodGroup)
  blood_group: BloodGroup;

  @IsEnum(ComponentType)
  @IsOptional()
  component_type?: ComponentType;

  @IsNumber()
  @Min(1)
  units_needed: number;

  @IsEnum(UrgencyLevel)
  @IsOptional()
  urgency?: UrgencyLevel;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  area_name: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  hospital_name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  patient_name?: string;

  @IsNumber()
  @IsOptional()
  patient_age?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  disease?: string;

  @IsDateString()
  @IsOptional()
  needed_time?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  patient_note?: string;

  @IsString()
  contact_phone: string;
}

export class UpdateRequestDto {
  @IsEnum(BloodGroup)
  @IsOptional()
  blood_group?: BloodGroup;

  @IsEnum(ComponentType)
  @IsOptional()
  component_type?: ComponentType;

  @IsNumber()
  @Min(1)
  @IsOptional()
  units_needed?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  units_fulfilled?: number;

  @IsEnum(UrgencyLevel)
  @IsOptional()
  urgency?: UrgencyLevel;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  area_name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  hospital_name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  patient_name?: string;

  @IsNumber()
  @IsOptional()
  patient_age?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  disease?: string;

  @IsDateString()
  @IsOptional()
  needed_time?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  patient_note?: string;

  @IsString()
  @IsOptional()
  contact_phone?: string;

  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;
}

export class NearbyQueryDto {
  @Type(() => Number)
  @IsNumber({}, { message: "lat must be a valid number" })
  @Min(-90, { message: "lat must be between -90 and 90" })
  @Max(90, { message: "lat must be between -90 and 90" })
  lat: number;

  @Type(() => Number)
  @IsNumber({}, { message: "lng must be a valid number" })
  @Min(-180, { message: "lng must be between -180 and 180" })
  @Max(180, { message: "lng must be between -180 and 180" })
  lng: number;

  @Type(() => Number)
  @IsNumber({}, { message: "radiusKm must be a valid number" })
  @IsOptional()
  @Min(0.1, { message: "radiusKm must be at least 0.1 km" })
  @Max(200, { message: "radiusKm cannot exceed 200 km" })
  radiusKm?: number;

  @IsString()
  @IsOptional()
  bloodGroup?: string;
}
