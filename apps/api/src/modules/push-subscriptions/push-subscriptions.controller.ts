import { Controller, Post, Delete, Body, UseGuards } from "@nestjs/common";
import { PushSubscriptionsService } from "./push-subscriptions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "../../entities/user.entity";

@Controller("push-subscriptions")
@UseGuards(JwtAuthGuard)
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  @Post()
  async subscribe(@CurrentUser() user: User, @Body() subscription: any) {
    return this.pushSubscriptionsService.saveSubscription(
      user.id,
      subscription,
    );
  }

  @Delete()
  async unsubscribe(
    @CurrentUser() user: User,
    @Body() body?: { endpoint?: string },
  ) {
    await this.pushSubscriptionsService.deleteSubscription(
      user.id,
      body?.endpoint,
    );
    return { success: true, message: "Subscription removed successfully" };
  }

  @Post("test")
  async test(@CurrentUser() user: User) {
    const appName = process.env.PROJECT_NAME || "Blood Aid";
    return this.pushSubscriptionsService.sendDirectTest(user.id, {
      title: `${appName} Test Alert`,
      body: "Push notifications are working properly on your device!",
      url: "/profile",
    });
  }
}
