import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as sanitizeHtml from 'sanitize-html';
import { BloodGroup } from '@repo/shared';

export class UpsertDonorProfileDto {
  @ApiPropertyOptional({ example: 'Tanvir Hossain' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  name?: string;

  @ApiPropertyOptional({ example: '+8801700000000' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  phone?: string;

  @ApiProperty({ enum: BloodGroup, example: BloodGroup.A_POS })
  @IsEnum(BloodGroup)
  blood_group: BloodGroup;

  @ApiProperty({ example: 23.8103, description: 'Latitude coordinate' })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 90.4125, description: 'Longitude coordinate' })
  @IsNumber()
  lng: number;

  @ApiProperty({ example: 'Dhanmondi, Dhaka' })
  @IsString()
  area_name: string;

  @ApiPropertyOptional({ example: '1998-05-15' })
  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: 26 })
  @IsNumber()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ example: 'Islam' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  religion?: string;

  @ApiPropertyOptional({ example: 'No known allergies or chronic illnesses' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  health_notes?: string;

  @ApiPropertyOptional({ example: 'Regular blood donor ready to help in emergencies' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  bio?: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsDateString()
  @IsOptional()
  last_donation_date?: string;
}

export class UpdateDonorProfileDto {
  @ApiPropertyOptional({ example: 'Tanvir Hossain' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  name?: string;

  @ApiPropertyOptional({ example: '+8801700000000' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  phone?: string;

  @ApiPropertyOptional({ enum: BloodGroup })
  @IsEnum(BloodGroup)
  @IsOptional()
  blood_group?: BloodGroup;

  @ApiPropertyOptional({ example: 23.8103 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 90.4125 })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 'Dhanmondi, Dhaka' })
  @IsString()
  @IsOptional()
  area_name?: string;

  @ApiPropertyOptional({ example: '1998-05-15' })
  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: 26 })
  @IsNumber()
  @IsOptional()
  age?: number;

  @ApiPropertyOptional({ example: 'Islam' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  religion?: string;

  @ApiPropertyOptional({ example: 'No known medical conditions' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  health_notes?: string;

  @ApiPropertyOptional({ example: 'Updated bio' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  bio?: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsDateString()
  @IsOptional()
  last_donation_date?: string;

  @ApiPropertyOptional({ example: true, description: 'Is donor ready and available for emergency donation' })
  @IsBoolean()
  @IsOptional()
  is_available?: boolean;
}

export class NearbyDonorsQueryDto {
  @ApiProperty({ example: 23.8103, minimum: -90, maximum: 90, description: 'Latitude' })
  @Type(() => Number)
  @IsNumber({}, { message: 'lat must be a valid number' })
  @Min(-90, { message: 'lat must be between -90 and 90' })
  @Max(90, { message: 'lat must be between -90 and 90' })
  lat: number;

  @ApiProperty({ example: 90.4125, minimum: -180, maximum: 180, description: 'Longitude' })
  @Type(() => Number)
  @IsNumber({}, { message: 'lng must be a valid number' })
  @Min(-180, { message: 'lng must be between -180 and 180' })
  @Max(180, { message: 'lng must be between -180 and 180' })
  lng: number;

  @ApiPropertyOptional({ example: 10, default: 10, minimum: 0.1, maximum: 200, description: 'Radius in km' })
  @Type(() => Number)
  @IsNumber({}, { message: 'radiusKm must be a valid number' })
  @IsOptional()
  @Min(0.1, { message: 'radiusKm must be at least 0.1 km' })
  @Max(200, { message: 'radiusKm cannot exceed 200 km' })
  radiusKm?: number = 10;

  @ApiPropertyOptional({ example: 'A_POS', description: 'Filter donors by blood group' })
  @IsString()
  @IsOptional()
  bloodGroup?: string;
}
