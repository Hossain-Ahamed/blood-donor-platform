import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditLogQueryDto } from "../audit-logs/dto/audit-log.dto";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Admin Audit Logs")
@ApiBearerAuth()
@Controller("admin/audit-logs")
@UseGuards(RolesGuard)
@Roles("ADMIN")
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get("stats")
  @ApiOperation({ summary: "[Admin] Get audit log aggregate stats" })
  @ApiQuery({ name: "fresh", description: "Bypass cache if true", required: false })
  async getStats(@Query("fresh") fresh?: string) {
    const isFresh = fresh === "true" || fresh === "1";
    return this.auditLogsService.getStats(isFresh);
  }

  @Get("admins")
  @ApiOperation({ summary: "[Admin] Get list of admin users for filtering" })
  @ApiQuery({ name: "fresh", description: "Bypass cache if true", required: false })
  async getAdmins(@Query("fresh") fresh?: string) {
    const isFresh = fresh === "true" || fresh === "1";
    return this.auditLogsService.getAdmins(isFresh);
  }

  @Get()
  @ApiOperation({ summary: "[Admin] Query and filter audit trail logs" })
  async findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}

