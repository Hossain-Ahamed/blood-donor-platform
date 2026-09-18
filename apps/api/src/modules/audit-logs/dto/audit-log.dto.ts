import { IsOptional, IsString, IsInt, Min, IsBoolean } from "class-validator";
import { Type, Transform } from "class-transformer";

export class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 15;

  @IsOptional()
  @IsString()
  admin_id?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  target_type?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === "1")
  @IsBoolean()
  fresh?: boolean = false;
}
