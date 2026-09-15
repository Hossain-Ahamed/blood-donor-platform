import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  async findAll() {
    return this.reportsService.findAll();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(id, dto);
  }
}
