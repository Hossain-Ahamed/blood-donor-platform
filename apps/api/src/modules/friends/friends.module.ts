import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Friendship } from "../../entities/friendship.entity";
import { User } from "../../entities/user.entity";
import { DonorProfile } from "../../entities/donor-profile.entity";
import { BloodRequest } from "../../entities/request.entity";
import { Donation } from "../../entities/donation.entity";
import { Response } from "../../entities/response.entity";
import { FriendsService } from "./friends.service";
import { FriendsController } from "./friends.controller";
import { PushSubscriptionsModule } from "../push-subscriptions/push-subscriptions.module";
import { SmartFeedModule } from "../smart-feed/smart-feed.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Friendship,
      User,
      DonorProfile,
      BloodRequest,
      Donation,
      Response,
    ]),
    PushSubscriptionsModule,
    SmartFeedModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
