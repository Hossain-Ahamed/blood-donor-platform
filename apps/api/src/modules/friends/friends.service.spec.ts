import { Test, TestingModule } from "@nestjs/testing";
import { FriendsService } from "./friends.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Friendship } from "../../entities/friendship.entity";
import { User } from "../../entities/user.entity";
import { DonorProfile } from "../../entities/donor-profile.entity";
import { BloodRequest } from "../../entities/request.entity";
import { Donation } from "../../entities/donation.entity";
import { PushSubscriptionsService } from "../push-subscriptions/push-subscriptions.service";
import { SmartFeedService } from "../smart-feed/smart-feed.service";
import { FriendshipStatus } from "@repo/shared";
import { ConflictException, BadRequestException } from "@nestjs/common";

describe("FriendsService", () => {
  let service: FriendsService;
  let friendshipRepoMock: any;
  let userRepoMock: any;
  let donorProfileRepoMock: any;
  let requestRepoMock: any;
  let donationRepoMock: any;
  let cacheManagerMock: any;
  let pushServiceMock: any;
  let smartFeedServiceMock: any;

  beforeEach(async () => {
    cacheManagerMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    friendshipRepoMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: "friendship-uuid-1", ...dto })),
      save: jest.fn().mockImplementation((f) => Promise.resolve({ id: "friendship-uuid-1", ...f })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };

    userRepoMock = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where.email === "target@example.com" || where.id === "target-uuid") {
          return Promise.resolve({
            id: "target-uuid",
            name: "Target User",
            email: "target@example.com",
            is_active: true,
          });
        }
        if (where.id === "user-uuid") {
          return Promise.resolve({
            id: "user-uuid",
            name: "Origin User",
            email: "origin@example.com",
            is_active: true,
          });
        }
        return Promise.resolve(null);
      }),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
    };

    donorProfileRepoMock = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    requestRepoMock = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
    };

    donationRepoMock = {
      createQueryBuilder: jest.fn(),
    };

    pushServiceMock = {
      notifyUsers: jest.fn().mockResolvedValue(undefined),
    };

    smartFeedServiceMock = {
      invalidateFeedCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        {
          provide: getRepositoryToken(Friendship),
          useValue: friendshipRepoMock,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepoMock,
        },
        {
          provide: getRepositoryToken(DonorProfile),
          useValue: donorProfileRepoMock,
        },
        {
          provide: getRepositoryToken(BloodRequest),
          useValue: requestRepoMock,
        },
        {
          provide: getRepositoryToken(Donation),
          useValue: donationRepoMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
        {
          provide: PushSubscriptionsService,
          useValue: pushServiceMock,
        },
        {
          provide: SmartFeedService,
          useValue: smartFeedServiceMock,
        },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  describe("sendRequest", () => {
    it("should reject self-requests", async () => {
      await expect(
        service.sendRequest("user-uuid", { addressee_id: "user-uuid" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should send a friend request and notify recipient", async () => {
      friendshipRepoMock.findOne.mockResolvedValue(null);

      const res = await service.sendRequest("user-uuid", {
        addressee_id: "target-uuid",
      });

      expect(res).toBeDefined();
      expect(friendshipRepoMock.save).toHaveBeenCalled();
      expect(pushServiceMock.notifyUsers).toHaveBeenCalledWith(
        ["target-uuid"],
        expect.objectContaining({ title: "New Friend Request" }),
      );
    });

    it("should reject if already friends", async () => {
      friendshipRepoMock.findOne.mockResolvedValue({
        id: "f-1",
        requester_id: "user-uuid",
        addressee_id: "target-uuid",
        status: FriendshipStatus.ACCEPTED,
      });

      await expect(
        service.sendRequest("user-uuid", { addressee_id: "target-uuid" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should auto-accept if reverse pending request exists", async () => {
      friendshipRepoMock.findOne.mockResolvedValue({
        id: "f-1",
        requester_id: "target-uuid",
        addressee_id: "user-uuid",
        status: FriendshipStatus.PENDING,
      });

      const res = await service.sendRequest("user-uuid", {
        addressee_id: "target-uuid",
      });

      expect(res.status).toBe(FriendshipStatus.ACCEPTED);
      expect(pushServiceMock.notifyUsers).toHaveBeenCalledWith(
        ["target-uuid"],
        expect.objectContaining({ title: "Friend Request Accepted 🎉" }),
      );
    });
  });

  describe("acceptRequest", () => {
    it("should accept pending request and notify requester", async () => {
      friendshipRepoMock.findOne.mockResolvedValue({
        id: "f-1",
        requester_id: "origin-uuid",
        addressee_id: "user-uuid",
        status: FriendshipStatus.PENDING,
      });

      const res = await service.acceptRequest("user-uuid", "f-1");
      expect(res.status).toBe(FriendshipStatus.ACCEPTED);
      expect(pushServiceMock.notifyUsers).toHaveBeenCalledWith(
        ["origin-uuid"],
        expect.objectContaining({ title: "Friend Request Accepted 🎉" }),
      );
    });
  });

  describe("unfriend", () => {
    it("should remove friendship bidirectionally", async () => {
      friendshipRepoMock.findOne.mockResolvedValue({
        id: "f-1",
        requester_id: "user-uuid",
        addressee_id: "target-uuid",
        status: FriendshipStatus.ACCEPTED,
      });

      const res = await service.unfriend("user-uuid", "target-uuid");
      expect(res.success).toBe(true);
      expect(friendshipRepoMock.delete).toHaveBeenCalledWith("f-1");
      expect(smartFeedServiceMock.invalidateFeedCache).toHaveBeenCalledWith("user-uuid");
      expect(smartFeedServiceMock.invalidateFeedCache).toHaveBeenCalledWith("target-uuid");
    });
  });
});
