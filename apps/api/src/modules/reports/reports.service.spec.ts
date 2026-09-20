jest.mock("sanitize-html", () => jest.fn((str) => str));

import { Test, TestingModule } from "@nestjs/testing";
import { ReportsService } from "./reports.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Report } from "../../entities/report.entity";
import { User } from "../../entities/user.entity";
import { BloodRequest } from "../../entities/request.entity";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import {
  ReportStatus,
  ReportTargetType,
  RequestStatus,
  UserRole,
} from "@repo/shared";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ReportResolutionAction } from "./dto/report.dto";

describe("ReportsService", () => {
  let service: ReportsService;
  let reportRepoMock: any;
  let userRepoMock: any;
  let requestRepoMock: any;
  let auditLogsServiceMock: any;
  let cacheManagerMock: any;

  beforeEach(async () => {
    cacheManagerMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    reportRepoMock = {
      create: jest.fn().mockImplementation((dto) => ({ id: "report-1", ...dto })),
      save: jest.fn().mockImplementation((r) => Promise.resolve({ id: "report-1", ...r })),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(10),
      createQueryBuilder: jest.fn(),
    };

    userRepoMock = {
      exists: jest.fn().mockResolvedValue(true),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    requestRepoMock = {
      exists: jest.fn().mockResolvedValue(true),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
    };

    auditLogsServiceMock = {
      record: jest.fn().mockResolvedValue({ id: "audit-1" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Report),
          useValue: reportRepoMock,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepoMock,
        },
        {
          provide: getRepositoryToken(BloodRequest),
          useValue: requestRepoMock,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsServiceMock,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe("create", () => {
    it("should throw NotFoundException if reported target user does not exist", async () => {
      userRepoMock.exists.mockResolvedValue(false);

      await expect(
        service.create("user-1", {
          target_type: ReportTargetType.USER,
          target_id: "non-existent-user",
          reason: "Spam behavior",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if user tries to report themselves", async () => {
      await expect(
        service.create("user-1", {
          target_type: ReportTargetType.USER,
          target_id: "user-1",
          reason: "Self report",
        }),
      ).rejects.toThrow(new BadRequestException("You cannot report yourself"));
    });

    it("should throw BadRequestException if user tries to report their own request", async () => {
      requestRepoMock.findOne.mockResolvedValue({
        id: "req-1",
        requester_id: "user-1",
      });

      await expect(
        service.create("user-1", {
          target_type: ReportTargetType.REQUEST,
          target_id: "req-1",
          reason: "Own request report",
        }),
      ).rejects.toThrow(new BadRequestException("You cannot report your own request"));
    });

    it("should throw BadRequestException if reporting is attempted within cooldown period", async () => {
      userRepoMock.exists.mockResolvedValue(true);
      cacheManagerMock.get.mockResolvedValue("1"); // Active cooldown

      await expect(
        service.create("user-1", {
          target_type: ReportTargetType.USER,
          target_id: "target-user-1",
          reason: "Spam behavior",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create report, set cooldown, and invalidate stats cache", async () => {
      userRepoMock.exists.mockResolvedValue(true);
      cacheManagerMock.get.mockResolvedValue(null);

      const result = await service.create("user-1", {
        target_type: ReportTargetType.USER,
        target_id: "target-user-1",
        reason: "Spam behavior",
      });

      expect(result).toBeDefined();
      expect(result.reporter_id).toBe("user-1");
      expect(result.status).toBe(ReportStatus.PENDING);
      expect(cacheManagerMock.set).toHaveBeenCalledWith(
        "report:cooldown:user-1:target-user-1",
        "1",
        15 * 60 * 1000,
      );
      expect(cacheManagerMock.del).toHaveBeenCalledWith("reports:stats");
      expect(cacheManagerMock.del).toHaveBeenCalledWith("admin:dashboard:stats");
    });
  });

  describe("update", () => {
    it("should throw NotFoundException if report does not exist", async () => {
      reportRepoMock.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          "non-existent-report",
          { status: ReportStatus.ACTIONED },
          "admin-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if admin attempts to block their own account via report resolution", async () => {
      const mockReport = {
        id: "rep-self",
        target_type: ReportTargetType.USER,
        target_id: "admin-1",
        reason: "Self report",
        status: ReportStatus.PENDING,
      };
      reportRepoMock.findOne.mockResolvedValue(mockReport);

      await expect(
        service.update(
          "rep-self",
          {
            status: ReportStatus.ACTIONED,
            action_target: ReportResolutionAction.BLOCK_USER,
          },
          "admin-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should action report and block target user when requested", async () => {
      const mockReport = {
        id: "rep-123",
        target_type: ReportTargetType.USER,
        target_id: "user-to-block",
        reason: "Commercial selling of blood",
        status: ReportStatus.PENDING,
      };
      reportRepoMock.findOne.mockResolvedValue(mockReport);

      const mockUser = {
        id: "user-to-block",
        is_active: true,
        role: UserRole.USER,
      };
      userRepoMock.findOne.mockResolvedValue(mockUser);

      const result = await service.update(
        "rep-123",
        {
          status: ReportStatus.ACTIONED,
          action_target: ReportResolutionAction.BLOCK_USER,
          admin_note: "Confirmed abusive commercial solicitation",
        },
        "admin-1",
      );

      expect(mockUser.is_active).toBe(false);
      expect(userRepoMock.save).toHaveBeenCalledWith(mockUser);
      expect(auditLogsServiceMock.record).toHaveBeenCalledWith(
        "admin-1",
        "BLOCK_USER",
        "USER",
        "user-to-block",
        expect.any(Object),
      );
      expect(auditLogsServiceMock.record).toHaveBeenCalledWith(
        "admin-1",
        "REVIEW_REPORT",
        "REPORT",
        "rep-123",
        expect.any(Object),
      );
      expect(result.status).toBe(ReportStatus.ACTIONED);
      expect(result.reviewed_by).toBe("admin-1");
    });

    it("should action report and cancel request when requested", async () => {
      const mockReport = {
        id: "rep-456",
        target_type: ReportTargetType.REQUEST,
        target_id: "req-to-cancel",
        reason: "Fake hospital address",
        status: ReportStatus.PENDING,
      };
      reportRepoMock.findOne.mockResolvedValue(mockReport);

      const mockRequest = {
        id: "req-to-cancel",
        status: RequestStatus.OPEN,
      };
      requestRepoMock.findOne.mockResolvedValue(mockRequest);

      const result = await service.update(
        "rep-456",
        {
          status: ReportStatus.ACTIONED,
          action_target: ReportResolutionAction.CANCEL_REQUEST,
          admin_note: "Verified hospital has no such patient",
        },
        "admin-1",
      );

      expect(mockRequest.status).toBe(RequestStatus.CANCELLED);
      expect(requestRepoMock.save).toHaveBeenCalledWith(mockRequest);
      expect(auditLogsServiceMock.record).toHaveBeenCalledWith(
        "admin-1",
        "CANCEL_REQUEST",
        "REQUEST",
        "req-to-cancel",
        expect.any(Object),
      );
      expect(result.status).toBe(ReportStatus.ACTIONED);
    });
  });

  describe("getStats", () => {
    it("should return aggregated counts for reports", async () => {
      reportRepoMock.count.mockResolvedValue(5);

      const stats = await service.getStats(true);

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(5);
      expect(stats.actioned).toBe(5);
      expect(stats.dismissed).toBe(5);
    });
  });
});
