import { IsEnum, IsString, IsOptional, IsInt, Min, IsBoolean } from "class-validator";
import { Transform, Type } from "class-transformer";
import * as sanitizeHtml from "sanitize-html";
import { ReportTargetType, ReportStatus } from "@repo/shared";

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  target_type: ReportTargetType;

  @IsString()
  target_id: string;

  @IsString()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  reason: string;
}

export enum ReportResolutionAction {
  BLOCK_USER = "BLOCK_USER",
  CANCEL_REQUEST = "CANCEL_REQUEST",
  NONE = "NONE",
}

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  admin_note?: string;

  @IsEnum(ReportResolutionAction)
  @IsOptional()
  action_target?: ReportResolutionAction;
}

export class ReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportTargetType)
  target_type?: ReportTargetType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === "1")
  @IsBoolean()
  fresh?: boolean = false;
}


