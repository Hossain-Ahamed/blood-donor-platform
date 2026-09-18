import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RequestsService } from "./requests.service";
import { RequestsController } from "./requests.controller";
import { BloodRequest } from "../../entities/request.entity";
import { User } from "../../entities/user.entity";

import { PushSubscriptionsModule } from "../push-subscriptions/push-subscriptions.module";
import { DonorProfilesModule } from "../donor-profiles/donor-profiles.module";
import { FriendsModule } from "../friends/friends.module";
import { SmartFeedModule } from "../smart-feed/smart-feed.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([BloodRequest, User]),
    PushSubscriptionsModule,
    DonorProfilesModule,
    FriendsModule,
    SmartFeedModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
