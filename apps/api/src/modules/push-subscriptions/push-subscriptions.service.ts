import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as webpush from "web-push";
import { PushSubscription } from "../../entities/push-subscription.entity";

@Injectable()
export class PushSubscriptionsService {
  private readonly logger = new Logger(PushSubscriptionsService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepository: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    const vapidPublicKey = this.configService.get<string>("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = this.configService.get<string>("VAPID_PRIVATE_KEY");

    // We use a dummy mailto if the email is not available in the environment,
    // though typically you should set a real mailto for web-push
    webpush.setVapidDetails(
      "mailto:admin@example.com",
      vapidPublicKey,
      vapidPrivateKey,
    );
  }

  async saveSubscription(
    userId: string,
    subscription: any,
  ): Promise<PushSubscription> {
    const { endpoint, keys } = subscription;

    let existing = await this.pushSubscriptionRepository.findOne({
      where: { user_id: userId, endpoint },
    });

    if (existing) {
      existing.p256dh = keys.p256dh;
      existing.auth = keys.auth;
      return this.pushSubscriptionRepository.save(existing);
    }

    const newSub = this.pushSubscriptionRepository.create({
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return this.pushSubscriptionRepository.save(newSub);
  }

  async findSubscriptionsForUsers(
    userIds: string[],
  ): Promise<PushSubscription[]> {
    if (userIds.length === 0) return [];

    return this.pushSubscriptionRepository
      .createQueryBuilder("sub")
      .where("sub.user_id IN (:...userIds)", { userIds })
      .getMany();
  }

  async sendNotification(
    subscription: PushSubscription,
    payload: any,
  ): Promise<void> {
    const pushSub = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub, JSON.stringify(payload));
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to ${subscription.endpoint}:`,
        error,
      );
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription has expired or is no longer valid
        await this.pushSubscriptionRepository.delete(subscription.id);
      }
    }
  }

  async notifyUsers(userIds: string[], payload: any): Promise<void> {
    const subscriptions = await this.findSubscriptionsForUsers(userIds);

    // Fire and forget
    Promise.all(
      subscriptions.map((sub) => this.sendNotification(sub, payload)),
    ).catch((err) => {
      this.logger.error("Error in notifyUsers Promise.all:", err);
    });
  }
}
