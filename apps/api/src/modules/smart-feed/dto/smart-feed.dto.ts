import { IsString, IsArray, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MarkAlertSeenDto {
  @ApiProperty({ description: "Alert UUID to mark as seen", example: "alert-uuid-1234" })
  @IsString()
  alertId: string;
}

export class MarkAllAlertsSeenDto {
  @ApiPropertyOptional({ description: "Optional array of alert IDs to mark as seen. If omitted, marks all.", example: ["alert-uuid-1", "alert-uuid-2"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  alertIds?: string[];
}
