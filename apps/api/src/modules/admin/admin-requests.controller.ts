import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { AdminRequestsService } from "./admin-requests.service";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "../../entities/user.entity";
import { AdminQueryRequestsDto, AdminUpdateRequestDto } from "./dto/admin-request.dto";

@ApiTags("Admin Requests")
@ApiBearerAuth()
@Controller("admin/requests")
@UseGuards(RolesGuard)
@Roles("ADMIN")
export class AdminRequestsController {
  constructor(private readonly requestsService: AdminRequestsService) {}

  @Get()
  @ApiOperation({ summary: "[Admin] Query blood requests with geo and status filtering" })
  async findAll(@Query() query: AdminQueryRequestsDto) {
    return this.requestsService.findAll(query);
  }

  @Patch(":id")
  @ApiOperation({ summary: "[Admin] Update blood request details or status" })
  @ApiParam({ name: "id", description: "Request UUID" })
  async update(
    @Param("id") id: string,
    @Body() updateData: AdminUpdateRequestDto,
    @CurrentUser() admin: User,
  ) {
    return this.requestsService.update(admin.id, id, updateData);
  }

  @Delete(":id")
  @ApiOperation({ summary: "[Admin] Permanently delete a blood request and its dependencies" })
  @ApiParam({ name: "id", description: "Request UUID" })
  async delete(@Param("id") id: string, @CurrentUser() admin: User) {
    return this.requestsService.delete(admin.id, id);
  }
}
