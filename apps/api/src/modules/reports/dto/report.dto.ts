import { IsEnum, IsString, IsOptional } from 'class-validator';
import { TargetType, ReportStatus } from '@repo/shared';

export class CreateReportDto {
  @IsEnum(TargetType)
  target_type: TargetType;

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
