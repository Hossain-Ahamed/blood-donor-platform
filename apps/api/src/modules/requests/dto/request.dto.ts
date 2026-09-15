import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';
import { BloodGroup, ComponentType, UrgencyLevel } from '@repo/shared';

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
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  hospital_name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  patient_note?: string;

  @IsString()
  contact_phone: string;
}

export class NearbyQueryDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsNumber()
  radiusKm: number;

  @IsEnum(BloodGroup)
  @IsOptional()
  bloodGroup?: BloodGroup;
}

