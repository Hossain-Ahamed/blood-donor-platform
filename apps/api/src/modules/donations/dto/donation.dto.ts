import { IsBoolean } from 'class-validator';

export class ConfirmDonationDto {
  @IsBoolean()
  confirmed: boolean;
}

