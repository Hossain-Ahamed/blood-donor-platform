import { Injectable, Logger, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { DonorProfile } from "../../entities/donor-profile.entity";
import { BloodRequest } from "../../entities/request.entity";
import { Response } from "../../entities/response.entity";
import { Donation } from "../../entities/donation.entity";
import { Friendship } from "../../entities/friendship.entity";
import {
  RequestStatus,
  ResponseStatus,
  UrgencyLevel,
  FriendshipStatus,
  SmartAlertItem,
  SmartFeedResponse,
  formatBloodGroup,
} from "@repo/shared";
import { getOrSetWithStampedeProtection } from "../../common/utils/cache.util";

@Injectable()
export class SmartFeedService {
  private readonly logger = new Logger(SmartFeedService.name);

  constructor(
    @InjectRepository(DonorProfile)
    private readonly donorProfileRepo: Repository<DonorProfile>,
    @InjectRepository(BloodRequest)
    private readonly requestRepo: Repository<BloodRequest>,
    @InjectRepository(Response)
    private readonly responseRepo: Repository<Response>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Retrieves or computes the user's active alerts:
   * 1. Check Redis cache (smart_feed:user:${userId}) -> returns in < 1ms on hit.
   * 2. On miss, aggregates:
   *    a) Active nearby OPEN blood requests matching user's blood group.
   *    b) Accepted donor offers & pending offers from the last 48 hours.
   *    c) Scheduled donation reminders for today or tomorrow.
   * 3. Tags seen/read status using Redis memory (smart_feed:seen:${userId}).
   * 4. Completely ZERO database writes or table accumulation.
   */
  async getFeed(userId: string): Promise<SmartFeedResponse> {
    const cacheKey = `smart_feed:user:${userId}`;

    // 1. Fetch or compute the raw alerts list (protected against Stampede & Penetration)
    const rawResult = await getOrSetWithStampedeProtection<{
      alerts: Omit<SmartAlertItem, "is_read">[];
      hasProfileLocation: boolean;
    }>(
      this.cacheManager,
      cacheKey,
      async () => this.computeRawAlerts(userId),
      120000, // 2 minutes TTL
    );

    const safeResult = rawResult || { alerts: [], hasProfileLocation: false };

    // 2. Fetch seen alert IDs from Redis (persisted across sessions without a DB table)
    const seenSet = await this.getSeenSet(userId);

    // 3. Mark is_read status and count unread
    let unreadCount = 0;
    const alertsWithReadState: SmartAlertItem[] = safeResult.alerts.map(
      (alert) => {
        const is_read = seenSet.has(alert.id);
        if (!is_read) unreadCount++;
        return {
          ...alert,
          is_read,
        };
      },
    );

    return {
      alerts: alertsWithReadState,
      unreadCount,
      hasProfileLocation: safeResult.hasProfileLocation,
    };
  }

  /**
   * Computes alerts dynamically on cache miss using PostgreSQL indexed read-only queries.
   */
  private async computeRawAlerts(
    userId: string,
  ): Promise<{
    alerts: Omit<SmartAlertItem, "is_read">[];
    hasProfileLocation: boolean;
  }> {
    const alerts: Omit<SmartAlertItem, "is_read">[] = [];

    // Step 1: Get donor profile
    const profile = await this.donorProfileRepo.findOne({
      where: { user_id: userId },
    });

    const hasProfileLocation = !!(
      profile?.location?.coordinates && profile?.blood_group
    );

    // Step 2: Nearby matching blood requests (within 15km)
    if (hasProfileLocation && profile.location.coordinates) {
      const [lng, lat] = profile.location.coordinates;

      try {
        const rawNearby = await this.requestRepo
          .createQueryBuilder("r")
          .addSelect(
            `ST_Distance(r.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) / 1000`,
            "distance_km",
          )
          .where("r.status = :status", { status: RequestStatus.OPEN })
          .andWhere("r.blood_group = :bg", { bg: profile.blood_group })
          .andWhere("r.requester_id != :userId", { userId })
          .andWhere(
            `ST_DWithin(r.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 15000)`,
          )
          .setParameters({ lng, lat, userId })
          .orderBy("distance_km", "ASC")
          .take(5)
          .getRawAndEntities();

        for (let i = 0; i < rawNearby.entities.length; i++) {
          const req = rawNearby.entities[i];
          const raw = rawNearby.raw[i];
          const distanceKm = raw?.distance_km
            ? parseFloat(parseFloat(raw.distance_km).toFixed(1))
            : undefined;

          alerts.push({
            id: `req_${req.id}`,
            type: "NEARBY_REQUEST",
            urgency:
              req.urgency === UrgencyLevel.CRITICAL ? "CRITICAL" : "WARNING",
            title: `Urgent: ${formatBloodGroup(req.blood_group)} Blood Needed!`,
            message: `${distanceKm !== undefined ? distanceKm + "km away: " : ""}${req.area_name}${req.hospital_name ? " (" + req.hospital_name + ")" : ""}`,
            link: `/requests/${req.id}`,
            timestamp: req.created_at.toISOString(),
            distance_km: distanceKm,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to compute nearby requests for user ${userId}: ${err}`);
      }
    }

    // Step 3: Accepted donor offers & pending offers from last 48 hours
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);

    try {
      // 3a. Donor offer accepted by requester
      const acceptedOffers = await this.responseRepo.find({
        where: {
          donor_id: userId,
          status: ResponseStatus.ACCEPTED,
          updated_at: MoreThanOrEqual(twoDaysAgo),
        },
        relations: ["request"],
        take: 5,
      });

      for (const offer of acceptedOffers) {
        alerts.push({
          id: `offer_acc_${offer.id}`,
          type: "OFFER_ACCEPTED",
          urgency: "SUCCESS",
          title: "Donation Offer Accepted! 🎉",
          message: `Your offer for ${offer.request?.area_name || "a blood request"} was accepted. Tap to view hospital and contact details.`,
          link: `/requests/${offer.request_id}`,
          timestamp: offer.updated_at.toISOString(),
        });
      }

      // 3b. Requester received volunteer offer
      const pendingOffers = await this.responseRepo
        .createQueryBuilder("resp")
        .innerJoinAndSelect("resp.request", "req")
        .where("req.requester_id = :userId", { userId })
        .andWhere("resp.status = :status", { status: ResponseStatus.OFFERED })
        .andWhere("resp.created_at >= :since", { since: twoDaysAgo })
        .take(5)
        .getMany();

      for (const offer of pendingOffers) {
        alerts.push({
          id: `offer_rec_${offer.id}`,
          type: "OFFER_RECEIVED",
          urgency: "INFO",
          title: "New Volunteer Applied!",
          message: `A donor has volunteered for your request in ${offer.request?.area_name || "your area"}. Tap to review and accept.`,
          link: `/requests/${offer.request_id}`,
          timestamp: offer.created_at.toISOString(),
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to compute offer updates for user ${userId}: ${err}`);
    }

    // Step 4: Scheduled donations for Today or Tomorrow
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(today);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);

      const scheduledDonations = await this.donationRepo
        .createQueryBuilder("don")
        .innerJoinAndSelect("don.response", "resp")
        .innerJoinAndSelect("resp.request", "req")
        .where("(resp.donor_id = :userId OR req.requester_id = :userId)", {
          userId,
        })
        .andWhere(
          "don.donation_date >= :today AND don.donation_date <= :tomorrowEnd",
          { today, tomorrowEnd },
        )
        .andWhere(
          "(don.confirmed_by_donor = false OR don.confirmed_by_requester = false)",
        )
        .take(3)
        .getMany();

      for (const don of scheduledDonations) {
        const isDonor = don.response?.donor_id === userId;
        alerts.push({
          id: `sched_don_${don.id}`,
          type: "DONATION_REMINDER",
          urgency: "WARNING",
          title: "Donation Scheduled for Today / Tomorrow",
          message: isDonor
            ? `Reminder: Your blood donation for ${don.response?.request?.area_name || "request"} is scheduled soon. Thank you for saving lives!`
            : `Reminder: A scheduled donation for your blood request is happening soon.`,
          link: `/requests/${don.response?.request_id}`,
          timestamp: don.created_at.toISOString(),
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to compute scheduled donations for user ${userId}: ${err}`);
    }

    // Step 5: Friendship Alerts
    // 5a. Pending received friend requests
    try {
      const pendingFriendRequests = await this.friendshipRepo
        .createQueryBuilder("f")
        .innerJoinAndSelect("f.requester", "req")
        .where("f.addressee_id = :userId AND f.status = :status", {
          userId,
          status: FriendshipStatus.PENDING,
        })
        .take(5)
        .getMany();

      for (const req of pendingFriendRequests) {
        alerts.push({
          id: `friend_req_${req.id}`,
          type: "FRIEND_REQUEST",
          urgency: "INFO",
          title: "New Friend Request",
          message: `${req.requester?.name || "A user"} sent you a friend request.`,
          link: "/friends",
          timestamp: req.created_at.toISOString(),
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to compute pending friend requests for user ${userId}: ${err}`,
      );
    }

    // 5b. Accepted friend requests from last 48 hours
    try {
      const acceptedFriendships = await this.friendshipRepo
        .createQueryBuilder("f")
        .innerJoinAndSelect("f.addressee", "addr")
        .where(
          "f.requester_id = :userId AND f.status = :status AND f.updated_at >= :since",
          {
            userId,
            status: FriendshipStatus.ACCEPTED,
            since: twoDaysAgo,
          },
        )
        .take(5)
        .getMany();

      for (const f of acceptedFriendships) {
        alerts.push({
          id: `friend_acc_${f.id}`,
          type: "FRIEND_ACCEPTED",
          urgency: "SUCCESS",
          title: "Friend Request Accepted 🎉",
          message: `You and ${f.addressee?.name || "a user"} are now friends.`,
          link: `/friends/${f.addressee_id}`,
          timestamp: f.updated_at.toISOString(),
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to compute accepted friendships for user ${userId}: ${err}`,
      );
    }

    // 5c. Active blood requests created by friends (without location or blood group filtering)
    try {
      const friendRows = await this.friendshipRepo.find({
        where: [
          { requester_id: userId, status: FriendshipStatus.ACCEPTED },
          { addressee_id: userId, status: FriendshipStatus.ACCEPTED },
        ],
      });

      const friendUserIds = friendRows.map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id,
      );

      if (friendUserIds.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const friendRequests = await this.requestRepo
          .createQueryBuilder("r")
          .innerJoinAndSelect("r.requester", "u")
          .where("r.requester_id IN (:...friendUserIds)", { friendUserIds })
          .andWhere("r.status = :status", { status: RequestStatus.OPEN })
          .andWhere("r.created_at >= :since", { since: sevenDaysAgo })
          .orderBy("r.created_at", "DESC")
          .take(5)
          .getMany();

        for (const req of friendRequests) {
          const exists = alerts.some(
            (a) =>
              a.id === `req_${req.id}` ||
              a.id === `friend_req_blood_${req.id}`,
          );
          if (!exists) {
            alerts.push({
              id: `friend_req_blood_${req.id}`,
              type: "FRIEND_BLOOD_REQUEST",
              urgency: "CRITICAL",
              title: `Friend in Need: ${req.requester?.name || "Friend"} needs ${formatBloodGroup(req.blood_group)} Blood!`,
              message: `${req.area_name}${req.hospital_name ? " (" + req.hospital_name + ")" : ""} • ${req.units_needed} unit(s) needed`,
              link: `/requests/${req.id}`,
              timestamp: req.created_at.toISOString(),
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to compute friend blood requests for user ${userId}: ${err}`,
      );
    }

    // Sort alerts: CRITICAL first, then by timestamp DESC
    alerts.sort((a, b) => {
      if (a.urgency === "CRITICAL" && b.urgency !== "CRITICAL") return -1;
      if (b.urgency === "CRITICAL" && a.urgency !== "CRITICAL") return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return {
      alerts,
      hasProfileLocation,
    };
  }

  /**
   * Marks a specific alert as seen in Redis memory.
   */
  async markAlertAsSeen(userId: string, alertId: string): Promise<void> {
    const seenKey = `smart_feed:seen:${userId}`;
    try {
      const currentSeen: string[] = (await this.cacheManager.get<string[]>(seenKey)) || [];
      if (!currentSeen.includes(alertId)) {
        currentSeen.push(alertId);
        // Persist seen set in Redis for 72 hours
        await this.cacheManager.set(seenKey, currentSeen, 72 * 3600 * 1000);
      }
    } catch (err) {
      this.logger.warn(`Failed to mark alert as seen in Redis: ${err}`);
    }
  }

  /**
   * Marks all provided alerts as seen in Redis memory.
   */
  async markAllAlertsAsSeen(userId: string, alertIds: string[]): Promise<void> {
    if (!alertIds || alertIds.length === 0) return;
    const seenKey = `smart_feed:seen:${userId}`;
    try {
      const currentSeen: string[] = (await this.cacheManager.get<string[]>(seenKey)) || [];
      const merged = Array.from(new Set([...currentSeen, ...alertIds]));
      await this.cacheManager.set(seenKey, merged, 72 * 3600 * 1000);
    } catch (err) {
      this.logger.warn(`Failed to mark all alerts as seen in Redis: ${err}`);
    }
  }

  /**
   * Instant O(1) Redis invalidation for real-time events (e.g. when an offer is accepted).
   */
  async invalidateFeedCache(userId: string): Promise<void> {
    try {
      await this.cacheManager.del(`smart_feed:user:${userId}`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate smart feed for user ${userId}: ${err}`);
    }
  }

  private async getSeenSet(userId: string): Promise<Set<string>> {
    const seenKey = `smart_feed:seen:${userId}`;
    try {
      const seenArray = await this.cacheManager.get<string[]>(seenKey);
      return new Set(Array.isArray(seenArray) ? seenArray : []);
    } catch {
      return new Set();
    }
  }
}
