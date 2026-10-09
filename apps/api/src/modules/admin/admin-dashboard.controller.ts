import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) { }

  @Get('stats')
  @ApiOperation({ summary: '[Admin] Get platform dashboard overview stats' })
  @ApiResponse({ status: 200, description: 'Aggregate statistics returned' })
  async getStats() {
    return this.dashboardService.getStats();
  }
}

