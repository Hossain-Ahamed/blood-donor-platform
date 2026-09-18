import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { CreateReportDto, UpdateReportDto, ReportQueryDto } from "./dto/report.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }

  @Get("stats")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  async getStats(@Query("fresh") fresh?: string) {
    const isFresh = fresh === "true" || fresh === "1";
    return this.reportsService.getStats(isFresh);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  async findAll(@Query() query: ReportQueryDto) {
    return this.reportsService.findAll(query);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
    @CurrentUser() admin: any,
  ) {
    return this.reportsService.update(id, dto, admin.id);
  }
}

