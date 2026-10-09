import { Injectable, Logger, BadRequestException } from "@nestjs/common";
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
    const adminEmail =
      this.configService.get<string>("ADMIN_EMAIL") || "ahamed.hossain@rpsu.edu.bd";

    webpush.setVapidDetails(
      `mailto:${adminEmail}`,
      vapidPublicKey,
      vapidPrivateKey,
    );
  }

  async saveSubscription(
    userId: string,
    subscription: any,
  ): Promise<PushSubscription> {
    const { endpoint, keys } = subscription;

    const existing = await this.pushSubscriptionRepository.findOne({
      where: { endpoint },
    });

    if (existing) {
      existing.user_id = userId;
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

  async deleteSubscription(userId: string, endpoint?: string): Promise<void> {
    if (endpoint) {
      await this.pushSubscriptionRepository.delete({ user_id: userId, endpoint });
    } else {
      await this.pushSubscriptionRepository.delete({ user_id: userId });
    }
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
      this.logger.log(`Push notification sent successfully to endpoint: ${subscription.endpoint.substring(0, 45)}...`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send push notification to ${subscription.endpoint.substring(0, 45)}...: ${error.message}`,
      );
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription has expired or is no longer valid
        this.logger.warn(`Push subscription expired/invalid (status ${error.statusCode}), deleting from database.`);
        await this.pushSubscriptionRepository.delete(subscription.id);
      }
    }
  }

  async notifyUsers(userIds: string[], payload: any): Promise<void> {
    const subscriptions = await this.findSubscriptionsForUsers(userIds);
    this.logger.log(`Found ${subscriptions.length} push subscription(s) for ${userIds.length} user(s)`);

    if (subscriptions.length === 0) {
      this.logger.log(`None of the target users have active push subscriptions`);
      return;
    }

    // Fire and forget
    Promise.all(
      subscriptions.map((sub) => this.sendNotification(sub, payload)),
    ).catch((err) => {
      this.logger.error("Error in notifyUsers Promise.all:", err);
    });
  }

  async sendDirectTest(
    userId: string,
    payload: any,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const subscriptions = await this.findSubscriptionsForUsers([userId]);
    this.logger.log(
      `Test notification: Found ${subscriptions.length} push subscription(s) for user ${userId}`,
    );

    if (subscriptions.length === 0) {
      throw new BadRequestException(
        "No active push subscription found for this user in the database. Please turn notifications off and back on in your browser.",
      );
    }

    const results = [];
    for (const sub of subscriptions) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        const res = await webpush.sendNotification(
          pushSub,
          JSON.stringify(payload),
        );
        this.logger.log(
          `Direct test push succeeded with status ${res.statusCode}`,
        );
        results.push({
          endpoint: sub.endpoint.substring(0, 45) + "...",
          statusCode: res.statusCode,
          success: true,
        });
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        const bodyText = typeof err.body === "string" ? err.body.trim() : JSON.stringify(err.body || "");
        const detail = `[HTTP ${statusCode}] ${bodyText || err.message}`;
        this.logger.error(`Direct test push failed for user ${userId}: ${detail}`);

        // If subscription is expired or unregistered on Google FCM, delete it immediately
        if (statusCode === 410 || statusCode === 404) {
          this.logger.warn(`Cleaning up expired subscription ${sub.id} (status ${statusCode})`);
          await this.pushSubscriptionRepository.delete(sub.id).catch(() => {});
        }

        results.push({
          endpoint: sub.endpoint.substring(0, 45) + "...",
          statusCode,
          success: false,
          error: detail,
        });
      }
    }

    const failed = results.filter((r) => !r.success);
    if (failed.length === results.length) {
      const allExpired = failed.every(
        (f) => f.statusCode === 410 || f.statusCode === 404,
      );
      if (allExpired) {
        throw new BadRequestException(
          "The push registration token was expired or invalidated by the browser gateway (FCM). The dead subscription has been cleared. Please turn notifications off and back on in your browser to generate a fresh token.",
        );
      }

      const anyAuth = failed.some((f) => f.statusCode === 401);
      if (anyAuth) {
        throw new BadRequestException(
          "Push gateway rejected VAPID keys (HTTP 401 Unauthorized). Please verify that VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY match NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
        );
      }

      throw new BadRequestException(
        `Push delivery failed by push gateway: ${failed.map((f) => f.error).join("; ")}`,
      );
    }

    return {
      success: true,
      message: `Test alert dispatched to ${results.filter((r) => r.success).length}/${subscriptions.length} registered device(s)!`,
      details: results,
    };
  }
}
