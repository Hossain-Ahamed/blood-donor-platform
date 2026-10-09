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
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import * as sanitizeHtml from "sanitize-html";
import {
  BloodGroup,
  ComponentType,
  UrgencyLevel,
  RequestStatus,
} from "@repo/shared";

export class CreateRequestDto {
  @ApiProperty({ enum: BloodGroup, example: BloodGroup.O_POS })
  @IsEnum(BloodGroup)
  blood_group: BloodGroup;

  @ApiPropertyOptional({ enum: ComponentType, example: ComponentType.WHOLE_BLOOD })
  @IsEnum(ComponentType)
  @IsOptional()
  component_type?: ComponentType;

  @ApiProperty({ example: 1, minimum: 1, description: "Number of blood bags/units required" })
  @IsNumber()
  @Min(1)
  units_needed: number;

  @ApiPropertyOptional({ enum: UrgencyLevel, example: UrgencyLevel.URGENT })
  @IsEnum(UrgencyLevel)
  @IsOptional()
  urgency?: UrgencyLevel;

  @ApiProperty({ example: 23.8103, description: "Latitude coordinate" })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 90.4125, description: "Longitude coordinate" })
  @IsNumber()
  lng: number;

  @ApiProperty({ example: "Dhanmondi, Dhaka", description: "Human-readable area/city name" })
  @IsString()
  area_name: string;

  @ApiPropertyOptional({ example: "Dhaka Medical College Hospital" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  hospital_name?: string;

  @ApiPropertyOptional({ example: "Rahim Uddin" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  patient_name?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsNumber()
  @IsOptional()
  patient_age?: number;

  @ApiPropertyOptional({ example: "Surgery" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  disease?: string;

  @ApiPropertyOptional({ example: new Date().toISOString() })
  @IsDateString()
  @IsOptional()
  needed_time?: string;

  @ApiPropertyOptional({ example: "Urgent need for O+ blood for emergency surgery" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  patient_note?: string;

  @ApiProperty({ example: "+8801700000000", description: "Direct contact phone number" })
  @IsString()
  contact_phone: string;
}

export class UpdateRequestDto {
  @ApiPropertyOptional({ enum: BloodGroup })
  @IsEnum(BloodGroup)
  @IsOptional()
  blood_group?: BloodGroup;

  @ApiPropertyOptional({ enum: ComponentType })
  @IsEnum(ComponentType)
  @IsOptional()
  component_type?: ComponentType;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  units_needed?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  units_fulfilled?: number;

  @ApiPropertyOptional({ enum: UrgencyLevel })
  @IsEnum(UrgencyLevel)
  @IsOptional()
  urgency?: UrgencyLevel;

  @ApiPropertyOptional({ example: 23.8103 })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 90.4125 })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: "Dhanmondi, Dhaka" })
  @IsString()
  @IsOptional()
  area_name?: string;

  @ApiPropertyOptional({ example: "Square Hospital" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  hospital_name?: string;

  @ApiPropertyOptional({ example: "Rahim Uddin" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  patient_name?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsNumber()
  @IsOptional()
  patient_age?: number;

  @ApiPropertyOptional({ example: "Dengue fever" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  disease?: string;

  @ApiPropertyOptional({ example: new Date().toISOString() })
  @IsDateString()
  @IsOptional()
  needed_time?: string;

  @ApiPropertyOptional({ example: "Patient condition updated" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  patient_note?: string;

  @ApiPropertyOptional({ example: "+8801700000000" })
  @IsString()
  @IsOptional()
  contact_phone?: string;

  @ApiPropertyOptional({ enum: RequestStatus })
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;
}

export class NearbyQueryDto {
  @ApiProperty({ example: 23.8103, minimum: -90, maximum: 90, description: "Latitude" })
  @Type(() => Number)
  @IsNumber({}, { message: "lat must be a valid number" })
  @Min(-90, { message: "lat must be between -90 and 90" })
  @Max(90, { message: "lat must be between -90 and 90" })
  lat: number;

  @ApiProperty({ example: 90.4125, minimum: -180, maximum: 180, description: "Longitude" })
  @Type(() => Number)
  @IsNumber({}, { message: "lng must be a valid number" })
  @Min(-180, { message: "lng must be between -180 and 180" })
  @Max(180, { message: "lng must be between -180 and 180" })
  lng: number;

  @ApiPropertyOptional({ example: 10, default: 10, minimum: 0.1, maximum: 200, description: "Radius in kilometers" })
  @Type(() => Number)
  @IsNumber({}, { message: "radiusKm must be a valid number" })
  @IsOptional()
  @Min(0.1, { message: "radiusKm must be at least 0.1 km" })
  @Max(200, { message: "radiusKm cannot exceed 200 km" })
  radiusKm?: number;

  @ApiPropertyOptional({ example: "O_POS", description: "Filter by specific blood group" })
  @IsString()
  @IsOptional()
  bloodGroup?: string;
}

export class QueryRequestsDto {
  @ApiPropertyOptional({ enum: RequestStatus, description: "Filter by request status" })
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @ApiPropertyOptional({ enum: BloodGroup, description: "Filter by blood group" })
  @IsEnum(BloodGroup)
  @IsOptional()
  blood_group?: BloodGroup;
}
