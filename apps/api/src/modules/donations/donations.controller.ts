import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { ConfirmDonationDto } from './dto/donation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Donations')
@ApiBearerAuth()
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get donation history for current user' })
  async getMyDonations(@CurrentUser() user: any) {
    return this.donationsService.getMyDonations(user.id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm completed donation by donation ID' })
  @ApiParam({ name: 'id', description: 'Donation UUID' })
  async confirm(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto?: ConfirmDonationDto,
  ) {
    return this.donationsService.confirm(id, user.id, dto?.confirmed ?? true);
  }

  @Patch('response/:responseId/confirm')
  @ApiOperation({ summary: 'Confirm completed donation by application response ID' })
  @ApiParam({ name: 'responseId', description: 'Response UUID' })
  async confirmByResponse(
    @Param('responseId') responseId: string,
    @CurrentUser() user: any,
    @Body() dto?: ConfirmDonationDto,
  ) {
    return this.donationsService.confirmByResponse(
      responseId,
      user.id,
      dto?.confirmed ?? true,
    );
  }
}
