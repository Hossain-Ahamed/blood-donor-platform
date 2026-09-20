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
import { Response } from "../../entities/response.entity";
import { PushSubscriptionsService } from "../push-subscriptions/push-subscriptions.service";
import { SmartFeedService } from "../smart-feed/smart-feed.service";
import {
  FriendshipStatus,
  FriendshipRelationStatus,
  FriendUser,
  FriendProfileDetail,
  RequestStatus,
} from "@repo/shared";
import {
  getOrSetWithStampedeProtection,
  invalidateCacheKeys,
  invalidateCachePattern,
} from "../../common/utils/cache.util";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";
import { GetFriendsQueryDto } from "./dto/get-friends-query.dto";

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
    @InjectRepository(Response)
    private readonly responseRepo: Repository<Response>,
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
    } else if (dto.phone) {
      const cleanPhone = dto.phone.trim();
      const digitsOnly = cleanPhone.replace(/[^0-9]/g, "");
      const phoneCandidates = new Set<string>();
      phoneCandidates.add(cleanPhone);
      if (digitsOnly.length >= 6) {
        phoneCandidates.add(digitsOnly);
        phoneCandidates.add(`+${digitsOnly}`);
        if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
          phoneCandidates.add(`88${digitsOnly}`);
          phoneCandidates.add(`+88${digitsOnly}`);
        } else if (digitsOnly.startsWith("880") && digitsOnly.length === 13) {
          phoneCandidates.add(`0${digitsOnly.slice(3)}`);
          phoneCandidates.add(`+${digitsOnly}`);
        }
      }
      targetUser = await this.userRepo
        .createQueryBuilder("u")
        .where("u.is_active = true")
        .andWhere(
          "(u.phone IN (:...phoneCandidates) OR REGEXP_REPLACE(COALESCE(u.phone, ''), '[^0-9]', '', 'g') = :digitsOnly)",
          {
            phoneCandidates: Array.from(phoneCandidates),
            digitsOnly,
          },
        )
        .getOne();
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
   * Gets paginated list of accepted friends with donor profiles, optimized for infinite scroll.
   * Single indexed query with LIMIT (limit + 1) OFFSET skip, protected with Stampede Redis Cache.
   */
  async getFriends(
    userId: string,
    query?: GetFriendsQueryDto,
  ): Promise<{
    data: FriendUser[];
    meta: { page: number; limit: number; hasMore: boolean };
  }> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 10));
    const search = query?.search?.trim();
    const bloodGroup = query?.blood_group?.trim();
    const skip = (page - 1) * limit;

    const cacheKey = `friends:list:${userId}:p${page}:l${limit}:s_${search || ""}:bg_${bloodGroup || "all"}`;

    return getOrSetWithStampedeProtection(
      this.cacheManager,
      cacheKey,
      async () => {
        const qb = this.friendshipRepo
          .createQueryBuilder("f")
          .innerJoin(
            User,
            "u",
            "u.id = CASE WHEN f.requester_id = :userId THEN f.addressee_id ELSE f.requester_id END",
            { userId },
          )
          .leftJoin(DonorProfile, "p", "p.user_id = u.id")
          .select([
            "f.id AS friendship_id",
            "f.updated_at AS friend_since",
            "u.id AS id",
            "u.name AS name",
            "u.email AS email",
            "u.avatar_url AS avatar_url",
            "u.phone AS phone",
            "p.blood_group AS blood_group",
            "p.area_name AS area_name",
            "p.is_available AS is_available",
            "p.last_donation_date AS last_donation_date",
          ])
          .where("(f.requester_id = :userId OR f.addressee_id = :userId)", {
            userId,
          })
          .andWhere("f.status = :status", {
            status: FriendshipStatus.ACCEPTED,
          });

        if (search) {
          qb.andWhere(
            "(u.name ILIKE :search OR u.email ILIKE :search OR u.phone ILIKE :search)",
            { search: `%${search}%` },
          );
        }

        if (bloodGroup && bloodGroup !== "all") {
          qb.andWhere("p.blood_group = :bloodGroup", { bloodGroup });
        }

        qb.orderBy("f.updated_at", "DESC")
          .offset(skip)
          .limit(limit + 1);

        const rawResults = await qb.getRawMany();
        const hasMore = rawResults.length > limit;
        const pageItems = rawResults.slice(0, limit);

        const data: FriendUser[] = pageItems.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          avatar_url: r.avatar_url,
          phone: r.phone,
          blood_group: r.blood_group || null,
          area_name: r.area_name || null,
          is_available:
            r.is_available !== null && r.is_available !== undefined
              ? Boolean(r.is_available)
              : null,
          last_donation_date: r.last_donation_date || null,
          friendship_id: r.friendship_id,
          friendship_status: "FRIENDS" as FriendshipRelationStatus,
          friend_since: r.friend_since,
        }));

        return {
          data,
          meta: {
            page,
            limit,
            hasMore,
          },
        };
      },
      60000, // 1 minute cache with Stampede protection
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
   * Searches users exclusively by exact email or exact phone number.
   * Both email and phone queries require an exact match (no partial/fuzzy/name matches).
   */
  async searchUsers(userId: string, query: string): Promise<FriendUser[]> {
    const trimmed = (query || "").trim();
    if (!trimmed) {
      return [];
    }

    const cleanedDigits = trimmed.replace(/[^0-9]/g, "");
    const phoneCandidates = new Set<string>();
    phoneCandidates.add(trimmed);
    if (cleanedDigits.length >= 6) {
      phoneCandidates.add(cleanedDigits);
      phoneCandidates.add(`+${cleanedDigits}`);
      if (cleanedDigits.startsWith("0") && cleanedDigits.length === 11) {
        phoneCandidates.add(`88${cleanedDigits}`);
        phoneCandidates.add(`+88${cleanedDigits}`);
      } else if (cleanedDigits.startsWith("880") && cleanedDigits.length === 13) {
        phoneCandidates.add(`0${cleanedDigits.slice(3)}`);
        phoneCandidates.add(`+${cleanedDigits}`);
      }
    }

    const qb = this.userRepo
      .createQueryBuilder("u")
      .where("u.id != :userId", { userId })
      .andWhere("u.is_active = true");

    if (cleanedDigits.length >= 6) {
      qb.andWhere(
        "(LOWER(u.email) = LOWER(:email) OR u.phone IN (:...phoneCandidates) OR REGEXP_REPLACE(COALESCE(u.phone, ''), '[^0-9]', '', 'g') = :cleanedDigits)",
        {
          email: trimmed,
          phoneCandidates: Array.from(phoneCandidates),
          cleanedDigits,
        },
      );
    } else {
      qb.andWhere("LOWER(u.email) = LOWER(:email)", {
        email: trimmed,
      });
    }

    const users = await qb.take(20).getMany();

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
   * Checks if two users have a lifetime request connection (one was requester, the other responded as donor).
   * Caches result in Redis with a 24-hour TTL under a normalized symmetric key.
   * Uses LIMIT 1 on indexed fields for maximum DB efficiency.
   */
  async hasLifetimeRequestConnection(
    userId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (userId === targetUserId) return true;

    const [u1, u2] = [userId, targetUserId].sort();
    const cacheKey = `users:req-connected:${u1}:${u2}`;

    try {
      const cached = await this.cacheManager.get<string | boolean>(cacheKey);
      if (cached !== null && cached !== undefined) {
        return cached === "true" || cached === true;
      }
    } catch (e) {
      this.logger.warn(`Failed to read connection cache: ${e}`);
    }

    // High performance query: uses index on responses and requests, LIMIT 1 stops immediately on first match
    const match = await this.responseRepo
      .createQueryBuilder("resp")
      .innerJoin("resp.request", "req")
      .select("resp.id")
      .where(
        "((resp.donor_id = :u1 AND req.requester_id = :u2) OR (resp.donor_id = :u2 AND req.requester_id = :u1))",
        { u1, u2 },
      )
      .limit(1)
      .getRawOne();

    const isConnected = Boolean(match);

    try {
      await this.cacheManager.set(
        cacheKey,
        isConnected ? "true" : "false",
        24 * 60 * 60 * 1000,
      );
    } catch (e) {
      this.logger.warn(`Failed to set connection cache: ${e}`);
    }

    return isConnected;
  }

  /**
   * Returns a user's full profile, donation history, and blood requests.
   * Access Rules:
   * - Self and Admins can always view full profiles.
   * - If the target user has an active OPEN blood request, anyone can view their profile details.
   * - Otherwise, only friends and lifetime-connected donors/requesters can view the profile.
   * Caches the heavy underlying profile bundle in Redis for 5 minutes with stampede protection.
   */
  async getFriendProfile(
    userId: string,
    targetUserId: string,
    isAdmin = false,
  ): Promise<FriendProfileDetail> {
    const cacheKey = `profile:user:${targetUserId}`;

    interface CachedUserProfileBundle {
      user: {
        id: string;
        name: string;
        email: string;
        avatar_url?: string | null;
        phone?: string | null;
        created_at: Date | string;
      };
      profile: {
        blood_group: any;
        area_name?: string | null;
        is_available: boolean;
        bio?: string | null;
        age?: number | null;
        date_of_birth?: Date | string | null;
        religion?: string | null;
        health_notes?: string | null;
        last_donation_date?: Date | string | null;
      } | null;
      donations: FriendProfileDetail["donations"];
      requests: FriendProfileDetail["requests"];
      has_open_request: boolean;
    }

    const bundle = await getOrSetWithStampedeProtection<CachedUserProfileBundle | null>(
      this.cacheManager,
      cacheKey,
      async () => {
        const targetUser = await this.userRepo.findOne({
          where: { id: targetUserId, is_active: true },
        });

        if (!targetUser) {
          return null;
        }

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

        // Check if user has an active OPEN request without unnecessary DB queries
        let hasOpenRequest = requests.some(
          (r) =>
            r.status === RequestStatus.OPEN ||
            r.status === RequestStatus.PARTIALLY_FULFILLED,
        );
        if (!hasOpenRequest && requests.length === 20) {
          hasOpenRequest = await this.requestRepo.exists({
            where: [
              { requester_id: targetUserId, status: RequestStatus.OPEN },
              { requester_id: targetUserId, status: RequestStatus.PARTIALLY_FULFILLED },
            ],
          });
        }

        return {
          user: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            avatar_url: targetUser.avatar_url,
            phone: targetUser.phone,
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
                health_notes: profile.health_notes,
                last_donation_date: profile.last_donation_date,
              }
            : null,
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
            area_name: r.area_name || "",
            hospital_name: r.hospital_name,
            created_at: r.created_at,
          })),
          has_open_request: hasOpenRequest,
        };
      },
      300000, // 5 minutes TTL
    );

    if (!bundle) {
      throw new NotFoundException("User not found");
    }

    const isSelf = userId === targetUserId;
    let canView = isSelf || isAdmin;
    let isFriends = false;
    let isConnected = false;
    let relationship: FriendshipRelationStatus = "NONE";
    let friendshipId: string | undefined;

    if (bundle.has_open_request) {
      // Anyone is allowed to view the profile if there is an active open blood request
      canView = true;
    }

    if (!isSelf) {
      const status = await this.getStatus(userId, targetUserId);
      relationship = status.relationship;
      friendshipId = status.friendship_id;
      isFriends = relationship === "FRIENDS";

      if (isFriends) {
        canView = true;
      } else if (!canView) {
        // Not friends and no open request: check lifetime request connection
        isConnected = await this.hasLifetimeRequestConnection(userId, targetUserId);
        if (isConnected) {
          canView = true;
        }
      } else {
        // Can view because open request, also check connection to determine phone visibility
        isConnected = await this.hasLifetimeRequestConnection(userId, targetUserId);
      }
    } else {
      relationship = "FRIENDS";
      isFriends = true;
    }

    if (!canView) {
      throw new ForbiddenException(
        "This profile is only visible while there is an active blood request, or to friends and connected donors.",
      );
    }

    const canSeePrivateDetails = isFriends || isConnected || isAdmin || isSelf;

    return {
      user: {
        id: bundle.user.id,
        name: bundle.user.name,
        email: bundle.user.email,
        avatar_url: bundle.user.avatar_url,
        phone: canSeePrivateDetails ? bundle.user.phone : null,
        created_at: bundle.user.created_at,
      },
      profile: bundle.profile
        ? {
            blood_group: bundle.profile.blood_group,
            area_name: bundle.profile.area_name,
            is_available: bundle.profile.is_available,
            bio: bundle.profile.bio,
            age: bundle.profile.age,
            date_of_birth: bundle.profile.date_of_birth,
            religion: bundle.profile.religion,
            health_notes: canSeePrivateDetails ? bundle.profile.health_notes : null,
            last_donation_date: bundle.profile.last_donation_date,
          }
        : null,
      relationship,
      friendship_id: friendshipId,
      donations: bundle.donations,
      requests: bundle.requests,
    };
  }

  /**
   * Invalidates cached profile bundle for a user.
   */
  async invalidateUserProfileCache(userId: string): Promise<void> {
    await invalidateCacheKeys(this.cacheManager, [`profile:user:${userId}`]);
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
      invalidateCachePattern(this.cacheManager, `friends:list:${userA}*`),
      invalidateCachePattern(this.cacheManager, `friends:list:${userB}*`),
      this.smartFeedService.invalidateFeedCache(userA),
      this.smartFeedService.invalidateFeedCache(userB),
    ]);
  }
}
