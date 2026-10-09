import { IsOptional, IsString, IsInt, Min, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus, UrgencyLevel } from '@repo/shared';

export class AdminQueryRequestsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: RequestStatus, description: 'Filter by request status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by blood group', example: 'A+' })
  @IsOptional()
  @IsString()
  blood_group?: string;

  @ApiPropertyOptional({ description: 'Filter created after ISO date' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Filter created before ISO date' })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Search by Request UUID or partial string' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Latitude for geo-filtering' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude for geo-filtering' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ description: 'Radius in km for geo-filtering' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Include soft-deleted records', default: 'false' })
  @IsOptional()
  @IsString()
  include_deleted?: string;
}

export class AdminUpdateRequestDto {
  @ApiPropertyOptional({ enum: RequestStatus, description: 'Request status' })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({ description: 'Blood group', example: 'B+' })
  @IsOptional()
  @IsString()
  blood_group?: string;

  @ApiPropertyOptional({ description: 'Blood component type', example: 'WHOLE_BLOOD' })
  @IsOptional()
  @IsString()
  component_type?: string;

  @ApiPropertyOptional({ description: 'Units needed', example: 1 })
  @IsOptional()
  @IsInt()
  units_needed?: number;

  @ApiPropertyOptional({ description: 'Units fulfilled', example: 0 })
  @IsOptional()
  @IsInt()
  units_fulfilled?: number;

  @ApiPropertyOptional({ enum: UrgencyLevel, description: 'Urgency level' })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency?: UrgencyLevel;

  @ApiPropertyOptional({ description: 'Hospital name', example: 'Dhaka Medical College' })
  @IsOptional()
  @IsString()
  hospital_name?: string;

  @ApiPropertyOptional({ description: 'Area name', example: 'Dhanmondi, Dhaka' })
  @IsOptional()
  @IsString()
  area_name?: string;

  @ApiPropertyOptional({ description: 'Patient contact phone', example: '+8801700000000' })
  @IsOptional()
  @IsString()
  contact_phone?: string;

  @ApiPropertyOptional({ description: 'Latitude', example: 23.8103 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude', example: 90.4125 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
