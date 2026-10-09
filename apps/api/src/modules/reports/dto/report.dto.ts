import { IsEnum, IsString, IsOptional, IsInt, Min, IsBoolean } from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import * as sanitizeHtml from "sanitize-html";
import { ReportTargetType, ReportStatus } from "@repo/shared";

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType, description: "Target entity type (USER or REQUEST)", example: ReportTargetType.USER })
  @IsEnum(ReportTargetType)
  target_type: ReportTargetType;

  @ApiProperty({ description: "Target ID (UUID of the user or request being reported)", example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsString()
  target_id: string;

  @ApiProperty({ description: "Reason or description of the issue", example: "Suspicious activity or harassment" })
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
  @ApiProperty({ enum: ReportStatus, description: "New report status", example: ReportStatus.ACTIONED })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({ description: "Internal admin note or resolution explanation", example: "Reviewed and user warned" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  admin_note?: string;

  @ApiPropertyOptional({ enum: ReportResolutionAction, description: "Action taken during resolution", example: ReportResolutionAction.NONE })
  @IsEnum(ReportResolutionAction)
  @IsOptional()
  action_target?: ReportResolutionAction;
}

export class ReportQueryDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ReportStatus, description: "Filter by status" })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ enum: ReportTargetType, description: "Filter by target type" })
  @IsOptional()
  @IsEnum(ReportTargetType)
  target_type?: ReportTargetType;

  @ApiPropertyOptional({ description: "Search keyword in reason or user" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Bypass Redis cache if true", default: false })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true || value === "1")
  @IsBoolean()
  fresh?: boolean = false;
}


