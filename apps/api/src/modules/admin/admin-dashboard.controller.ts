import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/dashboard')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) { }

  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }
}

