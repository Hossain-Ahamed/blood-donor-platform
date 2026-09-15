import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminRequestsService } from "./admin-requests.service";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "../../entities/user.entity";

@Controller("admin/requests")
@UseGuards(RolesGuard)
@Roles("ADMIN")
export class AdminRequestsController {
  constructor(private readonly requestsService: AdminRequestsService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.requestsService.findAll(query);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateData: { status: string },
    @CurrentUser() admin: User,
  ) {
    return this.requestsService.update(admin.id, id, updateData);
  }
}
