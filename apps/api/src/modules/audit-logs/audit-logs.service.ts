import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { AuditLog } from "../../entities/audit-log.entity";
import { User } from "../../entities/user.entity";
import { BloodRequest } from "../../entities/request.entity";
import { AuditLogQueryDto } from "./dto/audit-log.dto";
import { TargetSummary, EnrichedAuditLog, UserRole, formatBloodGroup } from "@repo/shared";
import {
  getOrSetWithStampedeProtection,
  invalidateCacheKeys,
} from "../../common/utils/cache.util";

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BloodRequest)
    private readonly requestRepository: Repository<BloodRequest>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Appends an audit log entry.
   * Strict append-only per project architecture; invalidates stats and recent caches.
   */
  async record(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    meta?: any,
  ): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      meta,
    });
    const saved = await this.auditLogRepository.save(log);

    // Invalidate stats cache
    await invalidateCacheKeys(this.cacheManager, [
      "audit_logs:stats",
      "admin:dashboard:stats",
    ]);

    return saved;
  }

  /**
   * Retrieves paginated audit logs with admin relation and target summaries.
   * Protected against Cache Stampedes with a 1-minute TTL and fresh bypass support.
   */
  async findAll(query: AuditLogQueryDto): Promise<{
    data: EnrichedAuditLog[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 15;
    const { admin_id, action, target_type, start_date, end_date } = query;
    const search = query.search?.trim().toLowerCase();
    const fresh = Boolean(query.fresh);

    const cacheKey = `audit_logs:list:p${page}:l${limit}:adm_${admin_id || "all"}:act_${action || "all"}:tt_${target_type || "all"}:sd_${start_date || ""}:ed_${end_date || ""}:s_${search || ""}`;

    return getOrSetWithStampedeProtection(
      this.cacheManager,
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;

        const qb = this.auditLogRepository
          .createQueryBuilder("audit")
          .leftJoinAndSelect("audit.admin", "admin")
          .skip(skip)
          .take(limit)
          .orderBy("audit.created_at", "DESC");

        if (admin_id) {
          qb.andWhere("audit.admin_id = :admin_id", { admin_id });
        }
        if (action) {
          qb.andWhere("audit.action = :action", { action });
        }
        if (target_type) {
          qb.andWhere("audit.target_type = :target_type", { target_type });
        }
        if (start_date) {
          qb.andWhere("audit.created_at >= :start_date", { start_date });
        }
        if (end_date) {
          qb.andWhere("audit.created_at <= :end_date", { end_date });
        }
        if (search) {
          qb.andWhere(
            "(LOWER(audit.action) LIKE :search OR LOWER(audit.target_type) LIKE :search OR LOWER(admin.name) LIKE :search OR LOWER(admin.email) LIKE :search)",
            { search: `%${search}%` },
          );
        }

        const [logs, total] = await qb.getManyAndCount();

        // Enrich target metadata
        const enriched = await this.enrichTargets(logs);

        return {
          data: enriched,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        };
      },
      60 * 1000, // 1 minute cache TTL
      fresh,
    );
  }

  /**
   * Computes audit log activity statistics with 1-minute cache and stampede protection.
   */
  async getStats(fresh: boolean = false): Promise<{
    totalLogs: number;
    actionsLast24Hours: number;
    mostFrequentAction: string;
    activeAdminsCount: number;
    actionBreakdown: Record<string, number>;
  }> {
    return getOrSetWithStampedeProtection(
      this.cacheManager,
      "audit_logs:stats",
      async () => {
        const totalLogs = await this.auditLogRepository.count();

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const actionsLast24Hours = await this.auditLogRepository
          .createQueryBuilder("audit")
          .where("audit.created_at >= :oneDayAgo", { oneDayAgo })
          .getCount();

        const actionCountsRaw: { action: string; count: string }[] =
          await this.auditLogRepository
            .createQueryBuilder("audit")
            .select("audit.action", "action")
            .addSelect("COUNT(*)", "count")
            .groupBy("audit.action")
            .orderBy("count", "DESC")
            .getRawMany();

        const actionBreakdown: Record<string, number> = {};
        let mostFrequentAction = "None";
        let maxCount = 0;

        for (const row of actionCountsRaw) {
          const count = parseInt(row.count, 10);
          actionBreakdown[row.action] = count;
          if (count > maxCount) {
            maxCount = count;
            mostFrequentAction = row.action;
          }
        }

        const activeAdminsRaw: { count: string }[] =
          await this.auditLogRepository
            .createQueryBuilder("audit")
            .select("COUNT(DISTINCT audit.admin_id)", "count")
            .getRawMany();

        const activeAdminsCount = parseInt(activeAdminsRaw[0]?.count || "0", 10);

        return {
          totalLogs,
          actionsLast24Hours,
          mostFrequentAction,
          activeAdminsCount,
          actionBreakdown,
        };
      },
      60 * 1000, // 1 minute cache TTL
      fresh,
    );
  }

  /**
   * Retrieves list of administrators who have performed administrative actions.
   * Useful for frontend filter dropdowns.
   */
  async getAdmins(fresh: boolean = false): Promise<
    { id: string; name: string; email: string; avatar_url: string | null }[]
  > {
    return getOrSetWithStampedeProtection(
      this.cacheManager,
      "audit_logs:admins",
      async () => {
        return this.userRepository.find({
          where: { role: UserRole.ADMIN },
          select: ["id", "name", "email", "avatar_url"],
          order: { name: "ASC" },
        });
      },
      5 * 60 * 1000, // 5 minutes cache
      fresh,
    );
  }

  /**
   * Enriches polymorphic target summaries for audit log rows.
   */
  private async enrichTargets(logs: AuditLog[]): Promise<EnrichedAuditLog[]> {
    if (!logs.length) return [];

    const userIds = new Set<string>();
    const requestIds = new Set<string>();

    for (const log of logs) {
      if (log.target_type === "USER") {
        userIds.add(log.target_id);
      } else if (log.target_type === "REQUEST") {
        requestIds.add(log.target_id);
      }
    }

    const users: User[] =
      userIds.size > 0
        ? await this.userRepository.find({
            where: { id: In(Array.from(userIds)) },
            select: ["id", "name", "email", "phone", "role", "is_active", "avatar_url"],
          })
        : [];

    const requests: BloodRequest[] =
      requestIds.size > 0
        ? await this.requestRepository.find({
            where: { id: In(Array.from(requestIds)) },
            select: [
              "id",
              "blood_group",
              "hospital_name",
              "area_name",
              "status",
              "urgency",
            ],
          })
        : [];

    const userMap = new Map<string, User>();
    for (const u of users) {
      userMap.set(u.id, u);
    }

    const reqMap = new Map<string, BloodRequest>();
    for (const req of requests) {
      reqMap.set(req.id, req);
    }

    return logs.map((log) => {
      let targetSummary: TargetSummary | null = null;

      if (log.target_type === "USER") {
        const u = userMap.get(log.target_id);
        targetSummary = u
          ? {
              id: u.id,
              type: "USER",
              label: u.name || u.email,
              details: u.email,
              status: u.is_active ? "ACTIVE" : "BLOCKED",
              extra: { avatar_url: u.avatar_url, role: u.role },
            }
          : {
              id: log.target_id,
              type: "USER",
              label: "User (Deleted / ID: " + log.target_id.slice(0, 8) + ")",
            };
      } else if (log.target_type === "REQUEST") {
        const req = reqMap.get(log.target_id);
        const bg = req?.blood_group ? formatBloodGroup(req.blood_group) : "";
        const location = req?.hospital_name || req?.area_name || "";
        targetSummary = req
          ? {
              id: req.id,
              type: "REQUEST",
              label: `${bg} request at ${location}`,
              details: `Status: ${req.status}, Urgency: ${req.urgency}`,
              status: req.status,
            }
          : {
              id: log.target_id,
              type: "REQUEST",
              label: "Request (ID: " + log.target_id.slice(0, 8) + ")",
            };
      } else if (log.target_type === "REPORT") {
        targetSummary = {
          id: log.target_id,
          type: "REPORT",
          label: `Report #${log.target_id.slice(0, 8)}`,
        };
      }

      return {
        ...log,
        target: targetSummary,
      };
    });
  }
}
