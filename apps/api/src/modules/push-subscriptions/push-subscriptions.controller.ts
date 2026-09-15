import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { PushSubscriptionsService } from "./push-subscriptions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
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
}
