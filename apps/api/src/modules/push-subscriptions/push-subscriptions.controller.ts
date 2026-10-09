import { Controller, Post, Delete, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PushSubscriptionsService } from "./push-subscriptions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "../../entities/user.entity";
import { SubscribePushDto, UnsubscribePushDto } from "./dto/push-subscription.dto";

@ApiTags("Push Notifications")
@ApiBearerAuth()
@Controller("push-subscriptions")
@UseGuards(JwtAuthGuard)
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Register or update a Web Push browser subscription" })
  @ApiResponse({ status: 201, description: "Subscription saved successfully" })
  async subscribe(@CurrentUser() user: User, @Body() subscription: SubscribePushDto) {
    return this.pushSubscriptionsService.saveSubscription(
      user.id,
      subscription,
    );
  }

  @Delete()
  @ApiOperation({ summary: "Unsubscribe device from Web Push notifications" })
  @ApiResponse({ status: 200, description: "Subscription removed successfully" })
  async unsubscribe(
    @CurrentUser() user: User,
    @Body() body?: UnsubscribePushDto,
  ) {
    await this.pushSubscriptionsService.deleteSubscription(
      user.id,
      body?.endpoint,
    );
    return { success: true, message: "Subscription removed successfully" };
  }

  @Post("test")
  @ApiOperation({ summary: "Trigger a test push notification to user's registered devices" })
  @ApiResponse({ status: 200, description: "Test notification dispatched" })
  async test(@CurrentUser() user: User) {
    const appName = process.env.PROJECT_NAME || "Blood Aid";
    return this.pushSubscriptionsService.sendDirectTest(user.id, {
      title: `${appName} Test Alert`,
      body: "Push notifications are working properly on your device!",
      url: "/profile",
    });
  }
}
