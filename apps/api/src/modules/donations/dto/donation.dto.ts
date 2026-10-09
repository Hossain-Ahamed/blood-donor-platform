import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmDonationDto {
  @ApiPropertyOptional({ description: 'Confirm donation completion', default: true })
  @IsBoolean()
  @IsOptional()
  confirmed?: boolean = true;
}
