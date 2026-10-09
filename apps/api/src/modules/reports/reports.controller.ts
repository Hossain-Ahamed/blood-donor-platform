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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { CreateReportDto, UpdateReportDto, ReportQueryDto } from "./dto/report.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: "Submit a report against a user or request" })
  @ApiResponse({ status: 201, description: "Report created successfully" })
  async create(@CurrentUser() user: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }

  @Get("stats")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "[Admin] Get report metrics and aggregate counts" })
  @ApiQuery({ name: "fresh", description: "Bypass cache if true", required: false })
  async getStats(@Query("fresh") fresh?: string) {
    const isFresh = fresh === "true" || fresh === "1";
    return this.reportsService.getStats(isFresh);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "[Admin] Query and filter submitted moderation reports" })
  async findAll(@Query() query: ReportQueryDto) {
    return this.reportsService.findAll(query);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "[Admin] Resolve, dismiss, or update a moderation report" })
  @ApiParam({ name: "id", description: "Report UUID" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
    @CurrentUser() admin: any,
  ) {
    return this.reportsService.update(id, dto, admin.id);
  }
}

