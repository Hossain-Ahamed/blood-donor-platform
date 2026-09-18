import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';
import { BloodGroup } from '@repo/shared';

export class UpsertDonorProfileDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  phone?: string;

  @IsEnum(BloodGroup)
  blood_group: BloodGroup;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  area_name: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsNumber()
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  religion?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  health_notes?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  bio?: string;

  @IsDateString()
  @IsOptional()
  last_donation_date?: string;
}

export class UpdateDonorProfileDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  phone?: string;

  @IsEnum(BloodGroup)
  @IsOptional()
  blood_group?: BloodGroup;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsString()
  @IsOptional()
  area_name?: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsNumber()
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  religion?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  health_notes?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  bio?: string;

  @IsDateString()
  @IsOptional()
  last_donation_date?: string;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;
}

export class NearbyDonorsQueryDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'lat must be a valid number' })
  @Min(-90, { message: 'lat must be between -90 and 90' })
  @Max(90, { message: 'lat must be between -90 and 90' })
  lat: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'lng must be a valid number' })
  @Min(-180, { message: 'lng must be between -180 and 180' })
  @Max(180, { message: 'lng must be between -180 and 180' })
  lng: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'radiusKm must be a valid number' })
  @IsOptional()
  @Min(0.1, { message: 'radiusKm must be at least 0.1 km' })
  @Max(200, { message: 'radiusKm cannot exceed 200 km' })
  radiusKm?: number = 10;

  @IsString()
  @IsOptional()
  bloodGroup?: string;
}

