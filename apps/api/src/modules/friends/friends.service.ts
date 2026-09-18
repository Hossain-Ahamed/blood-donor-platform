import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Friendship } from "../../entities/friendship.entity";
import { User } from "../../entities/user.entity";
import { DonorProfile } from "../../entities/donor-profile.entity";
import { BloodRequest } from "../../entities/request.entity";
import { Donation } from "../../entities/donation.entity";
import { PushSubscriptionsService } from "../push-subscriptions/push-subscriptions.service";
import { SmartFeedService } from "../smart-feed/smart-feed.service";
import {
  FriendshipStatus,
  FriendshipRelationStatus,
  FriendUser,
  FriendProfileDetail,
} from "@repo/shared";
import {
  getOrSetWithStampedeProtection,
  invalidateCacheKeys,
} from "../../common/utils/cache.util";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DonorProfile)
    private readonly donorProfileRepo: Repository<DonorProfile>,
    @InjectRepository(BloodRequest)
    private readonly requestRepo: Repository<BloodRequest>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly pushSubscriptionsService: PushSubscriptionsService,
    private readonly smartFeedService: SmartFeedService,
  ) {}

  /**
   * Sends a friend request by user ID or email.
   */
  async sendRequest(
    requesterId: string,
    dto: SendFriendRequestDto,
  ): Promise<Friendship> {
    let targetUser: User | null = null;

    if (dto.addressee_id) {
      targetUser = await this.userRepo.findOne({
        where: { id: dto.addressee_id, is_active: true },
      });
    } else if (dto.email) {
      targetUser = await this.userRepo.findOne({
        where: { email: dto.email.trim().toLowerCase(), is_active: true },
      });
    }

    if (!targetUser) {
      throw new NotFoundException("Target user not found");
    }

    if (targetUser.id === requesterId) {
      throw new BadRequestException(
        "You cannot send a friend request to yourself",
      );
    }

    const addresseeId = targetUser.id;

    // Check existing friendship in either direction
    const existing = await this.friendshipRepo.findOne({
      where: [
        { requester_id: requesterId, addressee_id: addresseeId },
        { requester_id: addresseeId, addressee_id: requesterId },
      ],
    });

    let savedFriendship: Friendship;

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException("You are already friends with this user");
      }

      if (existing.status === FriendshipStatus.PENDING) {
        if (existing.requester_id === requesterId) {
          throw new ConflictException(
            "Friend request already sent and pending",
          );
        } else {
          // Reverse request exists: auto-accept!
          existing.status = FriendshipStatus.ACCEPTED;
          savedFriendship = await this.friendshipRepo.save(existing);
          await this.invalidateFriendshipCache(requesterId, addresseeId);

          const requester = await this.userRepo.findOne({
            where: { id: requesterId },
          });
          this.pushSubscriptionsService
            .notifyUsers([existing.requester_id], {
              title: "Friend Request Accepted 🎉",
              body: `${requester?.name || "A user"} accepted your friend request.`,
              url: "/friends",
            })
            .catch((e) => this.logger.warn(`Push notify error: ${e}`));

          return savedFriendship;
        }
      }

      // If declined, re-open request with current requester
      existing.requester_id = requesterId;
      existing.addressee_id = addresseeId;
      existing.status = FriendshipStatus.PENDING;
      savedFriendship = await this.friendshipRepo.save(existing);
    } else {
      const friendship = this.friendshipRepo.create({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: FriendshipStatus.PENDING,
      });
      savedFriendship = await this.friendshipRepo.save(friendship);
    }

    await this.invalidateFriendshipCache(requesterId, addresseeId);

    // Send push notification to recipient
    const requester = await this.userRepo.findOne({
      where: { id: requesterId },
    });
    this.pushSubscriptionsService
      .notifyUsers([addresseeId], {
        title: "New Friend Request",
        body: `${requester?.name || "A user"} sent you a friend request.`,
        url: "/friends",
      })
      .catch((e) => this.logger.warn(`Push notify error: ${e}`));

    this.smartFeedService
      .invalidateFeedCache(addresseeId)
      .catch((e) => this.logger.warn(`Feed invalidate error: ${e}`));

    return savedFriendship;
  }

  /**
   * Accepts a pending friend request.
   */
  async acceptRequest(
    userId: string,
    friendshipId: string,
  ): Promise<Friendship> {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException("Friend request not found");
    }

    if (friendship.addressee_id !== userId) {
      throw new ForbiddenException(
        "You are not authorized to accept this friend request",
      );
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException("This friend request is no longer pending");
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    const saved = await this.friendshipRepo.save(friendship);

    await this.invalidateFriendshipCache(
      friendship.requester_id,
      friendship.addressee_id,
    );

    // Notify requester
    const accepter = await this.userRepo.findOne({ where: { id: userId } });
    this.pushSubscriptionsService
      .notifyUsers([friendship.requester_id], {
        title: "Friend Request Accepted 🎉",
        body: `${accepter?.name || "Your friend"} accepted your friend request.`,
        url: "/friends",
      })
      .catch((e) => this.logger.warn(`Push notify error: ${e}`));

    return saved;
  }

  /**
   * Declines a pending friend request.
   */
  async declineRequest(
    userId: string,
    friendshipId: string,
  ): Promise<{ success: boolean }> {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException("Friend request not found");
    }

    if (friendship.addressee_id !== userId) {
      throw new ForbiddenException(
        "You are not authorized to decline this friend request",
      );
    }

    await this.friendshipRepo.delete(friendship.id);
    await this.invalidateFriendshipCache(
      friendship.requester_id,
      friendship.addressee_id,
    );

    return { success: true };
  }

  /**
   * Cancels a pending friend request sent by the current user.
   */
  async cancelRequest(
    userId: string,
    friendshipId: string,
  ): Promise<{ success: boolean }> {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException("Friend request not found");
    }

    if (friendship.requester_id !== userId) {
      throw new ForbiddenException(
        "You are not authorized to cancel this friend request",
      );
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException(
        "Cannot cancel an accepted or processed request",
      );
    }

    await this.friendshipRepo.delete(friendship.id);
    await this.invalidateFriendshipCache(
      friendship.requester_id,
      friendship.addressee_id,
    );

    return { success: true };
  }

  /**
   * Bidirectional Unfriend: Removes friendship link completely between both users.
   */
  async unfriend(
    userId: string,
    friendUserId: string,
  ): Promise<{ success: boolean }> {
    const friendship = await this.friendshipRepo.findOne({
      where: [
        {
          requester_id: userId,
          addressee_id: friendUserId,
          status: FriendshipStatus.ACCEPTED,
        },
        {
          requester_id: friendUserId,
          addressee_id: userId,
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });

    if (!friendship) {
      throw new NotFoundException("Friendship not found");
    }

    await this.friendshipRepo.delete(friendship.id);
    await this.invalidateFriendshipCache(userId, friendUserId);

    return { success: true };
  }

  /**
   * Gets list of accepted friends with donor profiles, cached in Redis.
   */
  async getFriends(userId: string): Promise<FriendUser[]> {
    const cacheKey = `friends:list:${userId}`;

    return getOrSetWithStampedeProtection<FriendUser[]>(
      this.cacheManager,
      cacheKey,
      async () => {
        const friendships = await this.friendshipRepo
          .createQueryBuilder("f")
          .innerJoinAndSelect("f.requester", "req")
          .innerJoinAndSelect("f.addressee", "addr")
          .where("(f.requester_id = :userId OR f.addressee_id = :userId)", {
            userId,
          })
          .andWhere("f.status = :status", {
            status: FriendshipStatus.ACCEPTED,
          })
          .orderBy("f.updated_at", "DESC")
          .getMany();

        if (friendships.length === 0) {
          return [];
        }

        const friendUserIds = friendships.map((f) =>
          f.requester_id === userId ? f.addressee_id : f.requester_id,
        );

        const profiles = await this.donorProfileRepo.find({
          where: { user_id: In(friendUserIds) },
        });

        const profileMap = new Map<string, DonorProfile>();
        for (const p of profiles) {
          profileMap.set(p.user_id, p);
        }

        return friendships.map((f) => {
          const isRequester = f.requester_id === userId;
          const friend = isRequester ? f.addressee : f.requester;
          const profile = profileMap.get(friend.id);

          return {
            id: friend.id,
            name: friend.name,
            email: friend.email,
            avatar_url: friend.avatar_url,
            phone: friend.phone,
            blood_group: profile?.blood_group || null,
            area_name: profile?.area_name || null,
            is_available: profile?.is_available ?? null,
            last_donation_date: profile?.last_donation_date || null,
            friendship_id: f.id,
            friendship_status: "FRIENDS" as FriendshipRelationStatus,
            friend_since: f.updated_at,
          };
        });
      },
      600000, // 10 minutes TTL
    );
  }

  /**
   * Gets pending requests (received and sent), cached in Redis.
   */
  async getPendingRequests(userId: string): Promise<{
    received: FriendUser[];
    sent: FriendUser[];
  }> {
    const cacheKey = `friends:requests:${userId}`;

    return getOrSetWithStampedeProtection(
      this.cacheManager,
      cacheKey,
      async () => {
        const receivedRows = await this.friendshipRepo
          .createQueryBuilder("f")
          .innerJoinAndSelect("f.requester", "req")
          .where("f.addressee_id = :userId AND f.status = :status", {
            userId,
            status: FriendshipStatus.PENDING,
          })
          .orderBy("f.created_at", "DESC")
          .getMany();

        const sentRows = await this.friendshipRepo
          .createQueryBuilder("f")
          .innerJoinAndSelect("f.addressee", "addr")
          .where("f.requester_id = :userId AND f.status = :status", {
            userId,
            status: FriendshipStatus.PENDING,
          })
          .orderBy("f.created_at", "DESC")
          .getMany();

        const allUserIds = [
          ...receivedRows.map((r) => r.requester_id),
          ...sentRows.map((s) => s.addressee_id),
        ];

        const profileMap = new Map<string, DonorProfile>();
        if (allUserIds.length > 0) {
          const profiles = await this.donorProfileRepo.find({
            where: { user_id: In(allUserIds) },
          });
          for (const p of profiles) {
            profileMap.set(p.user_id, p);
          }
        }

        const received: FriendUser[] = receivedRows.map((f) => {
          const u = f.requester;
          const p = profileMap.get(u.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            avatar_url: u.avatar_url,
            phone: u.phone,
            blood_group: p?.blood_group || null,
            area_name: p?.area_name || null,
            is_available: p?.is_available ?? null,
            last_donation_date: p?.last_donation_date || null,
            friendship_id: f.id,
            friendship_status: "PENDING_RECEIVED" as FriendshipRelationStatus,
            friend_since: f.created_at,
          };
        });

        const sent: FriendUser[] = sentRows.map((f) => {
          const u = f.addressee;
          const p = profileMap.get(u.id);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            avatar_url: u.avatar_url,
            phone: u.phone,
            blood_group: p?.blood_group || null,
            area_name: p?.area_name || null,
            is_available: p?.is_available ?? null,
            last_donation_date: p?.last_donation_date || null,
            friendship_id: f.id,
            friendship_status: "PENDING_SENT" as FriendshipRelationStatus,
            friend_since: f.created_at,
          };
        });

        return { received, sent };
      },
      300000, // 5 minutes TTL
    );
  }

  /**
   * Returns friendship status between two users.
   */
  async getStatus(
    userId: string,
    targetUserId: string,
  ): Promise<{
    relationship: FriendshipRelationStatus;
    friendship_id?: string;
    is_self: boolean;
  }> {
    if (userId === targetUserId) {
      return { relationship: "NONE", is_self: true };
    }

    const cacheKey = `friends:status:${userId}:${targetUserId}`;

    return getOrSetWithStampedeProtection(
      this.cacheManager,
      cacheKey,
      async () => {
        const friendship = await this.friendshipRepo.findOne({
          where: [
            { requester_id: userId, addressee_id: targetUserId },
            { requester_id: targetUserId, addressee_id: userId },
          ],
        });

        if (!friendship) {
          return { relationship: "NONE", is_self: false };
        }

        if (friendship.status === FriendshipStatus.ACCEPTED) {
          return {
            relationship: "FRIENDS",
            friendship_id: friendship.id,
            is_self: false,
          };
        }

        if (friendship.status === FriendshipStatus.PENDING) {
          if (friendship.requester_id === userId) {
            return {
              relationship: "PENDING_SENT",
              friendship_id: friendship.id,
              is_self: false,
            };
          } else {
            return {
              relationship: "PENDING_RECEIVED",
              friendship_id: friendship.id,
              is_self: false,
            };
          }
        }

        return { relationship: "NONE", is_self: false };
      },
      600000,
    );
  }

  /**
   * Searches users by email or name, returning relationship status and donor profiles.
   */
  async searchUsers(userId: string, query: string): Promise<FriendUser[]> {
    const trimmed = (query || "").trim();
    if (!trimmed) {
      return [];
    }

    const users = await this.userRepo
      .createQueryBuilder("u")
      .where("u.id != :userId", { userId })
      .andWhere("u.is_active = true")
      .andWhere(
        "(LOWER(u.email) LIKE LOWER(:q) OR LOWER(u.name) LIKE LOWER(:q))",
        { q: `%${trimmed}%` },
      )
      .take(20)
      .getMany();

    if (users.length === 0) {
      return [];
    }

    const userIds = users.map((u) => u.id);

    const [profiles, friendships] = await Promise.all([
      this.donorProfileRepo.find({ where: { user_id: In(userIds) } }),
      this.friendshipRepo.find({
        where: [
          { requester_id: userId, addressee_id: In(userIds) },
          { requester_id: In(userIds), addressee_id: userId },
        ],
      }),
    ]);

    const profileMap = new Map<string, DonorProfile>();
    for (const p of profiles) {
      profileMap.set(p.user_id, p);
    }

    const friendshipMap = new Map<string, Friendship>();
    for (const f of friendships) {
      const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      friendshipMap.set(otherId, f);
    }

    return users.map((u) => {
      const p = profileMap.get(u.id);
      const f = friendshipMap.get(u.id);

      let relationship: FriendshipRelationStatus = "NONE";
      if (f) {
        if (f.status === FriendshipStatus.ACCEPTED) {
          relationship = "FRIENDS";
        } else if (f.status === FriendshipStatus.PENDING) {
          relationship =
            f.requester_id === userId ? "PENDING_SENT" : "PENDING_RECEIVED";
        }
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar_url: u.avatar_url,
        phone: relationship === "FRIENDS" ? u.phone : null,
        blood_group: p?.blood_group || null,
        area_name: p?.area_name || null,
        is_available: p?.is_available ?? null,
        last_donation_date: p?.last_donation_date || null,
        friendship_id: f?.id,
        friendship_status: relationship,
      };
    });
  }

  /**
   * Returns a user's full profile, donation history, and blood requests.
   * If friends, contact phone and detailed history are visible.
   */
  async getFriendProfile(
    userId: string,
    targetUserId: string,
  ): Promise<FriendProfileDetail> {
    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId, is_active: true },
    });

    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    const isSelf = userId === targetUserId;
    const status = await this.getStatus(userId, targetUserId);
    const isFriends = isSelf || status.relationship === "FRIENDS";

    const profile = await this.donorProfileRepo.findOne({
      where: { user_id: targetUserId },
    });

    // Fetch user's completed donation history
    const donations = await this.donationRepo
      .createQueryBuilder("don")
      .innerJoinAndSelect("don.response", "resp")
      .innerJoinAndSelect("resp.request", "req")
      .where("resp.donor_id = :targetUserId", { targetUserId })
      .orderBy("don.donation_date", "DESC")
      .take(20)
      .getMany();

    // Fetch user's blood requests
    const requests = await this.requestRepo.find({
      where: { requester_id: targetUserId },
      order: { created_at: "DESC" },
      take: 20,
    });

    return {
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        avatar_url: targetUser.avatar_url,
        phone: isFriends ? targetUser.phone : null,
        created_at: targetUser.created_at,
      },
      profile: profile
        ? {
            blood_group: profile.blood_group,
            area_name: profile.area_name,
            is_available: profile.is_available,
            bio: profile.bio,
            age: profile.age,
            date_of_birth: profile.date_of_birth,
            religion: profile.religion,
            health_notes: isFriends ? profile.health_notes : null,
            last_donation_date: profile.last_donation_date,
          }
        : null,
      relationship: isSelf ? "FRIENDS" : status.relationship,
      friendship_id: status.friendship_id,
      donations: donations.map((d) => ({
        id: d.id,
        donation_date: d.donation_date,
        area_name: d.response?.request?.area_name,
        hospital_name: d.response?.request?.hospital_name,
        blood_group: d.response?.request?.blood_group,
      })),
      requests: requests.map((r) => ({
        id: r.id,
        blood_group: r.blood_group,
        urgency: r.urgency,
        units_needed: r.units_needed,
        units_fulfilled: r.units_fulfilled,
        status: r.status,
        area_name: r.area_name,
        hospital_name: r.hospital_name,
        created_at: r.created_at,
      })),
    };
  }

  /**
   * Fast helper to retrieve all accepted friend IDs for a user.
   * Used for notification fan-out when a blood request is created.
   */
  async getFriendUserIds(userId: string): Promise<string[]> {
    const cacheKey = `friends:ids:${userId}`;

    return getOrSetWithStampedeProtection<string[]>(
      this.cacheManager,
      cacheKey,
      async () => {
        const friendships = await this.friendshipRepo.find({
          where: [
            { requester_id: userId, status: FriendshipStatus.ACCEPTED },
            { addressee_id: userId, status: FriendshipStatus.ACCEPTED },
          ],
        });

        return friendships.map((f) =>
          f.requester_id === userId ? f.addressee_id : f.requester_id,
        );
      },
      600000, // 10 minutes
    );
  }

  /**
   * Invalidates Redis caches for two users.
   */
  private async invalidateFriendshipCache(
    userA: string,
    userB: string,
  ): Promise<void> {
    const keys = [
      `friends:list:${userA}`,
      `friends:list:${userB}`,
      `friends:requests:${userA}`,
      `friends:requests:${userB}`,
      `friends:status:${userA}:${userB}`,
      `friends:status:${userB}:${userA}`,
      `friends:ids:${userA}`,
      `friends:ids:${userB}`,
    ];

    await invalidateCacheKeys(this.cacheManager, keys);
    await Promise.allSettled([
      this.smartFeedService.invalidateFeedCache(userA),
      this.smartFeedService.invalidateFeedCache(userB),
    ]);
  }
}
