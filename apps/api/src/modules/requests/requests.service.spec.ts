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
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: "request-1",
            location: { type: "Point", coordinates: [1.2, 3.4] },
          },
        ]),
    };

    requestRepositoryMock = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
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
});
