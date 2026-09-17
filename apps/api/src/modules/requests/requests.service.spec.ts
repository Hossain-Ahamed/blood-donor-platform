import { Test, TestingModule } from "@nestjs/testing";
import { RequestsService } from "./requests.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { BloodRequest } from "../../entities/request.entity";
import { PushSubscriptionsService } from "../push-subscriptions/push-subscriptions.service";
import { DonorProfilesService } from "../donor-profiles/donor-profiles.service";
import { RequestStatus, BloodGroup } from "@repo/shared";

describe("RequestsService", () => {
  let service: RequestsService;
  let cacheManagerMock: any;
  let queryBuilderMock: any;
  let requestRepositoryMock: any;

  beforeEach(async () => {
    cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
    };

    queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: "request-1",
          location: { type: "Point", coordinates: [1.2, 3.4] },
        },
      ]),
    };

    requestRepositoryMock = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        {
          provide: getRepositoryToken(BloodRequest),
          useValue: requestRepositoryMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
        {
          provide: PushSubscriptionsService,
          useValue: {},
        },
        {
          provide: DonorProfilesService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
  });

  describe("findNearby", () => {
    it("should return cached results if available", async () => {
      const cachedData = [{ id: "cached-request" }];
      cacheManagerMock.get.mockResolvedValue(cachedData);

      const result = await service.findNearby({
        lat: 10,
        lng: 20,
        radiusKm: 5,
      });

      expect(result).toEqual(cachedData);
      expect(cacheManagerMock.get).toHaveBeenCalled();
      expect(requestRepositoryMock.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should query database if cache is empty", async () => {
      cacheManagerMock.get.mockResolvedValue(null);

      const result = await service.findNearby({
        lat: 10,
        lng: 20,
        radiusKm: 5,
        bloodGroup: BloodGroup.A_POS,
      });

      expect(requestRepositoryMock.createQueryBuilder).toHaveBeenCalledWith(
        "request",
      );
      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        "request.status = :status",
        { status: RequestStatus.OPEN },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        `ST_DWithin(request.location, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)`,
      );
      expect(queryBuilderMock.setParameters).toHaveBeenCalledWith({
        lat: 10,
        lng: 20,
        radiusMeters: 5000,
      });
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        "request.blood_group = :bg",
        { bg: BloodGroup.A_POS },
      );

      // Sanitized results check
      expect(result).toEqual([
        {
          id: "request-1",
          location: { type: "Point", coordinates: [1.2, 3.4] },
        },
      ]);
      expect(cacheManagerMock.set).toHaveBeenCalled();
    });
  });

  describe("findMyRequests", () => {
    it("should return user's blood requests", async () => {
      const mockRequests = [{ id: "req-1", requester_id: "user-1" }];
      requestRepositoryMock.find.mockResolvedValue(mockRequests);

      const result = await service.findMyRequests("user-1");
      expect(result).toEqual(mockRequests);
      expect(requestRepositoryMock.find).toHaveBeenCalledWith({
        where: { requester_id: "user-1" },
        order: { created_at: "DESC" },
      });
    });
  });

  describe("update", () => {
    it("should allow requester to update their own request details and status", async () => {
      const existing = {
        id: "req-1",
        requester_id: "user-1",
        status: RequestStatus.OPEN,
        patient_name: "John",
      };
      requestRepositoryMock.findOne.mockResolvedValue(existing);

      const result = await service.update("user-1", "USER", "req-1", {
        status: RequestStatus.FULFILLED,
        patient_name: "John Doe",
      });

      expect(result.status).toBe(RequestStatus.FULFILLED);
      expect(result.patient_name).toBe("John Doe");
      expect(requestRepositoryMock.save).toHaveBeenCalled();
    });

    it("should allow admin to update any request", async () => {
      const existing = {
        id: "req-1",
        requester_id: "user-1",
        status: RequestStatus.OPEN,
      };
      requestRepositoryMock.findOne.mockResolvedValue(existing);

      const result = await service.update("admin-99", "ADMIN", "req-1", {
        status: RequestStatus.CANCELLED,
      });

      expect(result.status).toBe(RequestStatus.CANCELLED);
      expect(requestRepositoryMock.save).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if another user attempts to update", async () => {
      const existing = {
        id: "req-1",
        requester_id: "user-1",
        status: RequestStatus.OPEN,
      };
      requestRepositoryMock.findOne.mockResolvedValue(existing);

      await expect(
        service.update("user-2", "USER", "req-1", {
          status: RequestStatus.CANCELLED,
        }),
      ).rejects.toThrow("You are not authorized to update this blood request");
    });
  });

  describe("delete", () => {
    it("should allow requester to delete their own request", async () => {
      const existing = {
        id: "req-1",
        requester_id: "user-1",
      };
      requestRepositoryMock.findOne.mockResolvedValue(existing);

      const result = await service.delete("user-1", "USER", "req-1");
      expect(result).toEqual({
        success: true,
        message: "Request deleted successfully",
      });
      expect(requestRepositoryMock.softDelete).toHaveBeenCalledWith("req-1");
    });

    it("should allow admin to delete any request", async () => {
      const existing = {
        id: "req-1",
        requester_id: "user-1",
      };
      requestRepositoryMock.findOne.mockResolvedValue(existing);

      const result = await service.delete("admin-1", "ADMIN", "req-1");
      expect(result.success).toBe(true);
      expect(requestRepositoryMock.softDelete).toHaveBeenCalledWith("req-1");
    });

    it("should throw ForbiddenException if another user attempts to delete", async () => {
      const existing = {
        id: "req-1",
        requester_id: "user-1",
      };
      requestRepositoryMock.findOne.mockResolvedValue(existing);

      await expect(service.delete("user-2", "USER", "req-1")).rejects.toThrow(
        "You are not authorized to delete this blood request",
      );
    });
  });
});
