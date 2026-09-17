import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "../../entities/notification.entity";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PushSubscriptionsModule } from "../push-subscriptions/push-subscriptions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    PushSubscriptionsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
