import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
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
  @IsNumber()
  @IsOptional()
  lat?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lng?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  radiusKm?: number;

  @IsString()
  @IsOptional()
  bloodGroup?: string;
}
