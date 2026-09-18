import { Test, TestingModule } from "@nestjs/testing";
import { AuditLogsService } from "./audit-logs.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { AuditLog } from "../../entities/audit-log.entity";
import { User } from "../../entities/user.entity";
import { BloodRequest } from "../../entities/request.entity";
import { UserRole } from "@repo/shared";

describe("AuditLogsService", () => {
  let service: AuditLogsService;
  let auditLogRepoMock: any;
  let userRepoMock: any;
  let requestRepoMock: any;
  let cacheManagerMock: any;

  beforeEach(async () => {
    cacheManagerMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    auditLogRepoMock = {
      create: jest.fn().mockImplementation((dto) => ({ id: "audit-1", ...dto })),
      save: jest.fn().mockImplementation((log) => Promise.resolve({ id: "audit-1", ...log })),
      count: jest.fn().mockResolvedValue(42),
      createQueryBuilder: jest.fn(),
    };

    userRepoMock = {
      find: jest.fn().mockResolvedValue([]),
    };

    requestRepoMock = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: auditLogRepoMock,
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
          provide: CACHE_MANAGER,
          useValue: cacheManagerMock,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  describe("record", () => {
    it("should append an audit log entry and invalidate stats caches", async () => {
      const result = await service.record(
        "admin-123",
        "BLOCK_USER",
        "USER",
        "user-456",
        { reason: "Violation of terms" },
      );

      expect(auditLogRepoMock.create).toHaveBeenCalledWith({
        admin_id: "admin-123",
        action: "BLOCK_USER",
        target_type: "USER",
        target_id: "user-456",
        meta: { reason: "Violation of terms" },
      });
      expect(auditLogRepoMock.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.action).toBe("BLOCK_USER");
      expect(cacheManagerMock.del).toHaveBeenCalledWith("audit_logs:stats");
      expect(cacheManagerMock.del).toHaveBeenCalledWith("admin:dashboard:stats");
    });
  });

  describe("getAdmins", () => {
    it("should return admins list for filter dropdown", async () => {
      const mockAdmins = [
        {
          id: "admin-1",
          name: "Super Admin",
          email: "admin@bloodaid.org",
          avatar_url: null,
          role: UserRole.ADMIN,
        },
      ];
      userRepoMock.find.mockResolvedValue(mockAdmins);

      const result = await service.getAdmins(true);
      expect(result).toEqual(mockAdmins);
      expect(userRepoMock.find).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
        select: ["id", "name", "email", "avatar_url"],
        order: { name: "ASC" },
      });
    });
  });

  describe("getStats", () => {
    it("should compute audit activity metrics correctly", async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(12),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([
            { action: "BLOCK_USER", count: "10" },
            { action: "UPDATE_REQUEST", count: "2" },
          ])
          .mockResolvedValueOnce([{ count: "3" }]),
      };

      auditLogRepoMock.createQueryBuilder.mockReturnValue(qbMock);

      const stats = await service.getStats(true);

      expect(stats.totalLogs).toBe(42);
      expect(stats.actionsLast24Hours).toBe(12);
      expect(stats.mostFrequentAction).toBe("BLOCK_USER");
      expect(stats.activeAdminsCount).toBe(3);
      expect(stats.actionBreakdown).toEqual({
        BLOCK_USER: 10,
        UPDATE_REQUEST: 2,
      });
    });
  });
});
