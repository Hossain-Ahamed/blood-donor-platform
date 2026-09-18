import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SmartFeedService } from "./smart-feed.service";
import { SmartFeedController } from "./smart-feed.controller";
import { DonorProfile } from "../../entities/donor-profile.entity";
import { BloodRequest } from "../../entities/request.entity";
import { Response } from "../../entities/response.entity";
import { Donation } from "../../entities/donation.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DonorProfile,
      BloodRequest,
      Response,
      Donation,
    ]),
  ],
  controllers: [SmartFeedController],
  providers: [SmartFeedService],
  exports: [SmartFeedService],
})
export class SmartFeedModule {}
