import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ReportTargetType, ReportStatus } from '@repo/shared';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  target_type: ReportTargetType;

  @IsString()
  target_id: string;

  @IsString()
  reason: string;
}

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsString()
  @IsOptional()
  admin_note?: string;
}

