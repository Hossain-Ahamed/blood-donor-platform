import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@Controller("admin/audit-logs")
@UseGuards(RolesGuard)
@Roles("ADMIN")
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.auditLogsService.findAll(query);
  }
}
