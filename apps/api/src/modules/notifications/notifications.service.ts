import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "../../entities/notification.entity";
import { CreateNotificationDto } from "./dto/notification.dto";
import { PushSubscriptionsService } from "../push-subscriptions/push-subscriptions.service";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user_id: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type || NotificationType.GENERAL,
      link: dto.link || null,
    });

    const saved = await this.notificationRepository.save(notification);

    // Dispatch web push notification
    try {
      await this.pushSubscriptionsService.notifyUsers([dto.userId], {
        title: dto.title,
        body: dto.message,
        url: dto.link || "/",
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to trigger push for user ${dto.userId}: ${err?.message}`,
      );
    }

    return saved;
  }

  async getUserNotifications(
    userId: string,
    limit = 30,
  ): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user_id: userId },
      order: { created_at: "DESC" },
      take: limit,
    });
  }
}
