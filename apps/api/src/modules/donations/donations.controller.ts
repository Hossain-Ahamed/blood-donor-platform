import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { ConfirmDonationDto } from './dto/donation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) { }

  @Get('me')
  async getMyDonations(@CurrentUser() user: any) {
    return this.donationsService.getMyDonations(user.id);
  }

  @Patch(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ConfirmDonationDto,
  ) {
    return this.donationsService.confirm(id, user.id, dto.confirmed);
  }
}
