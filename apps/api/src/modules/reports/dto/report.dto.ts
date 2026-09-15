import { IsEnum, IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';
import { ReportTargetType, ReportStatus } from '@repo/shared';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  target_type: ReportTargetType;

  @IsString()
  target_id: string;

  @IsString()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  reason: string;
}

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  admin_note?: string;
}

