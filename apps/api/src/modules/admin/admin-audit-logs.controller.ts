import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditLogQueryDto } from "../audit-logs/dto/audit-log.dto";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("admin/audit-logs")
@UseGuards(RolesGuard)
@Roles("ADMIN")
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get("stats")
  async getStats(@Query("fresh") fresh?: string) {
    const isFresh = fresh === "true" || fresh === "1";
    return this.auditLogsService.getStats(isFresh);
  }

  @Get("admins")
  async getAdmins(@Query("fresh") fresh?: string) {
    const isFresh = fresh === "true" || fresh === "1";
    return this.auditLogsService.getAdmins(isFresh);
  }

  @Get()
  async findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}

