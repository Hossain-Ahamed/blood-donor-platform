import { Controller, Get, Post, Patch, Body } from '@nestjs/common';
import { DonorProfilesService } from './donor-profiles.service';
import { UpsertDonorProfileDto, UpdateDonorProfileDto } from './dto/donor-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('donor-profiles')
export class DonorProfilesController {
  constructor(private readonly donorProfilesService: DonorProfilesService) { }

  @Post()
  async upsert(@CurrentUser() user: any, @Body() dto: UpsertDonorProfileDto) {
    return this.donorProfilesService.upsert(user.id, dto);
  }

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.donorProfilesService.getMe(user.id);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: any, @Body() dto: UpdateDonorProfileDto) {
    return this.donorProfilesService.updateMe(user.id, dto);
  }
}
