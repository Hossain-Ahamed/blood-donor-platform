import { IsOptional, IsString, IsInt, Min, IsBoolean } from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 15;

  @ApiPropertyOptional({ description: "Filter by admin user ID" })
  @IsOptional()
  @IsString()
  admin_id?: string;

  @ApiPropertyOptional({ description: "Filter by action name" })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "Filter by target type (e.g. USER, REQUEST, REPORT)" })
  @IsOptional()
  @IsString()
  target_type?: string;

  @ApiPropertyOptional({ description: "Filter start date (ISO string)" })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: "Filter end date (ISO string)" })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ description: "Search keyword" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Bypass cache if true", default: false })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === "1")
  @IsBoolean()
  fresh?: boolean = false;
}
