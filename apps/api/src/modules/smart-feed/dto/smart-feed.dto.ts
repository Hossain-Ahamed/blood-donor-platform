import { IsString, IsArray, IsOptional } from "class-validator";

export class MarkAlertSeenDto {
  @IsString()
  alertId: string;
}

export class MarkAllAlertsSeenDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  alertIds?: string[];
}
