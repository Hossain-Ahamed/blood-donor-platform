import { Test, TestingModule } from "@nestjs/testing";
import { SmartFeedService } from "./smart-feed.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { DonorProfile } from "../../entities/donor-profile.entity";
import { BloodRequest } from "../../entities/request.entity";
import { Response } from "../../entities/response.entity";
import { Donation } from "../../entities/donation.entity";
import { Friendship } from "../../entities/friendship.entity";
import { BloodGroup, RequestStatus, UrgencyLevel, ResponseStatus } from "@repo/shared";

describe("SmartFeedService", () => {
  let service: SmartFeedService;
  let cacheManagerMock: any;
  let donorProfileRepoMock: any;
  let requestRepoMock: any;
  let responseRepoMock: any;
  let donationRepoMock: any;
  let friendshipRepoMock: any;

  const mockUserId = "user-uuid-1234";

  beforeEach(async () => {
    cacheManagerMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    donorProfileRepoMock = {
      findOne: jest.fn().mockResolvedValue({
        id: "profile-1",
        user_id: mockUserId,
        blood_group: BloodGroup.O_POS,
        location: {
          type: "Point",
          coordinates: [90.4125, 23.8103], // Dhaka [lng, lat]
        },
      }),
    };

    const mockNearbyQueryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [
          {
            id: "req-1",
            blood_group: BloodGroup.O_POS,
            urgency: UrgencyLevel.CRITICAL,
            area_name: "Mirpur 10",
            hospital_name: "Hope Hospital",
            created_at: new Date(),
          },
        ],
        raw: [{ distance_km: "2.4" }],
      }),
    };

    requestRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(mockNearbyQueryBuilder),
    };

    const mockPendingOffersQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    responseRepoMock = {
      find: jest.fn().mockResolvedValue([
        {
          id: "resp-1",
          donor_id: mockUserId,
          status: ResponseStatus.ACCEPTED,
          updated_at: new Date(),
          request: { area_name: "Dhanmondi" },
          request_id: "req-2",
        },
      ]),
      createQueryBuilder: jest.fn().mockReturnValue(mockPendingOffersQueryBuilder),
    };

    const mockDonationQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    donationRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(mockDonationQueryBuilder),
    };

    const mockFriendshipQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    friendshipRepoMock = {
      createQueryBuilder: jest.fn().mockReturnValue(mockFriendshipQueryBuilder),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartFeedService,
        {
          provide: getRepositoryToken(DonorProfile),
          useValue: donorProfileRepoMock,
        },
        {
          provide: getRepositoryToken(BloodRequest),
          useValue: requestRepoMock,
        },
        {
          provide: getRepositoryToken(Response),
          useValue: responseRepoMock,
        },
        {
          provide: getRepositoryToken(Donation),
          useValue: donationRepoMock,
        },
        {
          provide: getRepositoryToken(Friendship),
          useValue: friendshipRepoMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
      ],
    }).compile();

    service = module.get<SmartFeedService>(SmartFeedService);
  });

  describe("getFeed", () => {
    it("should return cached alerts immediately on Redis hit without calling database", async () => {
      const cachedPayload = {
        alerts: [
          {
            id: "req_req-cached",
            type: "NEARBY_REQUEST",
            urgency: "CRITICAL",
            title: "Cached Alert",
            message: "Cached message",
            link: "/requests/cached",
            timestamp: new Date().toISOString(),
          },
        ],
        hasProfileLocation: true,
      };

      cacheManagerMock.get.mockImplementation(async (key: string) => {
        if (key.includes("smart_feed:user:")) return cachedPayload;
        if (key.includes("smart_feed:seen:")) return [];
        return null;
      });

      const feed = await service.getFeed(mockUserId);

      expect(feed.alerts).toHaveLength(1);
      expect(feed.alerts[0].title).toBe("Cached Alert");
      expect(feed.alerts[0].is_read).toBe(false);
      expect(feed.unreadCount).toBe(1);
      expect(donorProfileRepoMock.findOne).not.toHaveBeenCalled();
    });

    it("should compute alerts on cache miss and store in Redis", async () => {
      const feed = await service.getFeed(mockUserId);

      expect(feed.alerts.length).toBeGreaterThanOrEqual(1);
      expect(feed.hasProfileLocation).toBe(true);
      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        `smart_feed:user:${mockUserId}`,
        expect.any(Object),
        expect.any(Number),
      );
    });

    it("should mark seen alerts as read from Redis set", async () => {
      cacheManagerMock.get.mockImplementation(async (key: string) => {
        if (key.includes("smart_feed:seen:")) return ["req_req-1"];
        return null;
      });

      const feed = await service.getFeed(mockUserId);

      const readAlert = feed.alerts.find((a) => a.id === "req_req-1");
      expect(readAlert?.is_read).toBe(true);
    });
  });

  describe("markAlertAsSeen", () => {
    it("should add alert ID to Redis seen set", async () => {
      cacheManagerMock.get.mockResolvedValueOnce(["seen-1"]);

      await service.markAlertAsSeen(mockUserId, "seen-2");

      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        `smart_feed:seen:${mockUserId}`,
        ["seen-1", "seen-2"],
        72 * 3600 * 1000,
      );
    });
  });

  describe("invalidateFeedCache", () => {
    it("should delete user smart feed cache key from Redis", async () => {
      await service.invalidateFeedCache(mockUserId);

      expect(cacheManagerMock.del).toHaveBeenCalledWith(
        `smart_feed:user:${mockUserId}`,
      );
    });
  });
});
