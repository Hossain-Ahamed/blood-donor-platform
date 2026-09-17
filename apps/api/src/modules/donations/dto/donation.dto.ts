import { IsBoolean, IsOptional } from 'class-validator';

export class ConfirmDonationDto {
  @IsBoolean()
  @IsOptional()
  confirmed?: boolean = true;
}
