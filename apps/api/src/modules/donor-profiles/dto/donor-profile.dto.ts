import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';
import { BloodGroup } from '@repo/shared';

export class UpsertDonorProfileDto {
  @IsEnum(BloodGroup)
  blood_group: BloodGroup;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  area_name: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  bio?: string;

  @IsDateString()
  @IsOptional()
  last_donation_date?: string;
}

export class UpdateDonorProfileDto {
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

