import { Controller, Get, Query } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query("limit") limit?: number,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      limit ? Number(limit) : 30,
    );
  }
}
