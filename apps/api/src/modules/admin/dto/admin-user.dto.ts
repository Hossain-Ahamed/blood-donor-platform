import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminQueryUsersDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', example: 'true' })
  @IsOptional()
  @IsString()
  is_active?: string;

  @ApiPropertyOptional({ description: 'Filter by role', example: 'USER' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ description: 'Account active status (set false to block)', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'User role (USER or ADMIN)', example: 'USER' })
  @IsOptional()
  @IsString()
  role?: string;
}

