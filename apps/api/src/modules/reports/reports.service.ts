import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Report } from "../../entities/report.entity";
import { User } from "../../entities/user.entity";
import { BloodRequest } from "../../entities/request.entity";
import {
  CreateReportDto,
  UpdateReportDto,
  ReportQueryDto,
  ReportResolutionAction,
} from "./dto/report.dto";
import {
  ReportStatus,
  ReportTargetType,
  RequestStatus,
  TargetSummary,
  EnrichedReport,
  formatBloodGroup,
} from "@repo/shared";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import {
  getOrSetWithStampedeProtection,
  invalidateCacheKeys,
  invalidateCachePattern,
} from "../../common/utils/cache.util";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BloodRequest)
    private readonly requestRepository: Repository<BloodRequest>,
    private readonly auditLogsService: AuditLogsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Submits a new user/request report with duplicate cooldown and target validation.
   */
  async create(userId: string, dto: CreateReportDto): Promise<Report> {
    // 1. Verify target exists and prevent reporting oneself or own request
    if (dto.target_type === ReportTargetType.USER) {
      if (dto.target_id === userId) {
        throw new BadRequestException("You cannot report yourself");
      }
      const targetExists = await this.userRepository.exists({
        where: { id: dto.target_id },
      });
      if (!targetExists) {
        throw new NotFoundException("Target user not found");
      }
    } else if (dto.target_type === ReportTargetType.REQUEST) {
      const bloodReq = await this.requestRepository.findOne({
        where: { id: dto.target_id },
        select: ["id", "requester_id"],
      });
      if (!bloodReq) {
        throw new NotFoundException("Target request not found");
      }
      if (bloodReq.requester_id === userId) {
        throw new BadRequestException("You cannot report your own request");
      }
    }

    // 2. Prevent abusive duplicate reporting on the exact same target by the same user within 15 mins
    const cooldownKey = `report:cooldown:${userId}:${dto.target_id}`;
    const recentReport = await this.cacheManager.get(cooldownKey);
    if (recentReport) {
      throw new BadRequestException(
        "You have already submitted a report for this item recently. Our admin team is reviewing it.",
      );
    }

    // 3. Save report
    const report = this.reportRepository.create({
      reporter_id: userId,
      target_type: dto.target_type,
      target_id: dto.target_id,
      reason: dto.reason,
      status: ReportStatus.PENDING,
    });
    const saved = await this.reportRepository.save(report);

    // 4. Set cooldown (15 minutes = 900,000 ms)
    try {
      await this.cacheManager.set(cooldownKey, "1", 15 * 60 * 1000);
    } catch (e) {
      this.logger.warn(`Failed to set report cooldown: ${e}`);
    }

    // 5. Invalidate cached lists, stats, and admin dashboard stats
    await invalidateCacheKeys(this.cacheManager, [
      "reports:stats",
      "admin:dashboard:stats",
    ]);
    await invalidateCachePattern(this.cacheManager, "reports:*");

    return saved;
  }

  /**
   * Retrieves paginated reports with relations and target summaries.
   * Utilizes Cache Stampede protection with a 1-minute TTL and fresh data bypass.
   */
  async findAll(query: ReportQueryDto): Promise<{
    data: EnrichedReport[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const status = query.status;
    const targetType = query.target_type;
    const search = query.search?.trim().toLowerCase();
    const fresh = Boolean(query.fresh);

    const cacheKey = `reports:list:p${page}:l${limit}:st_${status || "all"}:tt_${targetType || "all"}:s_${search || ""}`;

    return getOrSetWithStampedeProtection(
      this.cacheManager,
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;

        const qb = this.reportRepository
          .createQueryBuilder("report")
          .leftJoinAndSelect("report.reporter", "reporter")
          .leftJoinAndSelect("report.reviewer", "reviewer")
          .skip(skip)
          .take(limit)
          .orderBy("report.created_at", "DESC");

        if (status) {
          qb.andWhere("report.status = :status", { status });
        }

        if (targetType) {
          qb.andWhere("report.target_type = :targetType", { targetType });
        }

        if (search) {
          qb.andWhere(
            "(LOWER(report.reason) LIKE :search OR LOWER(reporter.name) LIKE :search OR LOWER(reporter.email) LIKE :search)",
            { search: `%${search}%` },
          );
        }

        const [reports, total] = await qb.getManyAndCount();

        // Enrich target summaries
        const enriched = await this.enrichTargets(reports);

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
   * Aggregated report statistics with 1-minute cache and stampede protection.
   */
  async getStats(fresh: boolean = false): Promise<{
    total: number;
    pending: number;
    reviewed: number;
    actioned: number;
    dismissed: number;
    userReports: number;
    requestReports: number;
  }> {
    return getOrSetWithStampedeProtection(
      this.cacheManager,
      "reports:stats",
      async () => {
        const [total, pending, reviewed, actioned, dismissed, userReports, requestReports] =
          await Promise.all([
            this.reportRepository.count(),
            this.reportRepository.count({
              where: { status: ReportStatus.PENDING },
            }),
            this.reportRepository.count({
              where: { status: ReportStatus.REVIEWED },
            }),
            this.reportRepository.count({
              where: { status: ReportStatus.ACTIONED },
            }),
            this.reportRepository.count({
              where: { status: ReportStatus.DISMISSED },
            }),
            this.reportRepository.count({
              where: { target_type: ReportTargetType.USER },
            }),
            this.reportRepository.count({
              where: { target_type: ReportTargetType.REQUEST },
            }),
          ]);

        return {
          total,
          pending,
          reviewed,
          actioned,
          dismissed,
          userReports,
          requestReports,
        };
      },
      60 * 1000, // 1 minute cache TTL
      fresh,
    );
  }

  /**
   * Updates report status, optional admin resolution actions, and records audit trail.
   */
  async update(
    id: string,
    dto: UpdateReportDto,
    adminId: string,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    const beforeStatus = report.status;
    let targetActionTaken: string | null = null;

    // Optional direct administrative action on target
    if (
      dto.action_target === ReportResolutionAction.BLOCK_USER &&
      report.target_type === ReportTargetType.USER
    ) {
      if (report.target_id === adminId) {
        throw new BadRequestException(
          "Administrators cannot block their own account.",
        );
      }
      const user = await this.userRepository.findOne({
        where: { id: report.target_id },
      });
      if (user && user.is_active) {
        user.is_active = false;
        await this.userRepository.save(user);
        await this.auditLogsService.record(
          adminId,
          "BLOCK_USER",
          "USER",
          user.id,
          {
            reason: `Blocked via Report #${report.id.slice(0, 8)}: ${report.reason}`,
            before: { is_active: true },
            after: { is_active: false },
          },
        );
        targetActionTaken = "BLOCKED_USER";
      }
    } else if (
      dto.action_target === ReportResolutionAction.CANCEL_REQUEST &&
      report.target_type === ReportTargetType.REQUEST
    ) {
      const bloodReq = await this.requestRepository.findOne({
        where: { id: report.target_id },
      });
      if (bloodReq && bloodReq.status !== RequestStatus.CANCELLED) {
        const prevReqStatus = bloodReq.status;
        bloodReq.status = RequestStatus.CANCELLED;
        await this.requestRepository.save(bloodReq);
        await invalidateCacheKeys(this.cacheManager, [
          `profile:user:${bloodReq.requester_id}`,
        ]);
        await this.auditLogsService.record(
          adminId,
          "CANCEL_REQUEST",
          "REQUEST",
          bloodReq.id,
          {
            reason: `Cancelled via Report #${report.id.slice(0, 8)}: ${report.reason}`,
            before: { status: prevReqStatus },
            after: { status: RequestStatus.CANCELLED },
          },
        );
        targetActionTaken = "CANCELLED_REQUEST";
      }
    }

    report.status = dto.status;
    report.reviewed_by = adminId;
    report.reviewed_at = new Date();

    const savedReport = await this.reportRepository.save(report);

    // Audit log the report review
    await this.auditLogsService.record(
      adminId,
      "REVIEW_REPORT",
      "REPORT",
      report.id,
      {
        before: { status: beforeStatus },
        after: { status: report.status, reviewed_by: adminId },
        admin_note: dto.admin_note,
        action_target: dto.action_target,
        target_action_taken: targetActionTaken,
      },
    );

    // Invalidate caches
    await invalidateCacheKeys(this.cacheManager, [
      "reports:stats",
      "admin:dashboard:stats",
      `cache:target:${report.target_type}:${report.target_id}`,
    ]);
    await invalidateCachePattern(this.cacheManager, "reports:*");

    return savedReport;
  }

  /**
   * Enriches report items with target metadata (cached in Redis for quick resolution).
   */
  private async enrichTargets(reports: Report[]): Promise<EnrichedReport[]> {
    if (!reports.length) return [];

    const userIds = new Set<string>();
    const requestIds = new Set<string>();

    for (const r of reports) {
      if (r.target_type === ReportTargetType.USER) {
        userIds.add(r.target_id);
      } else if (r.target_type === ReportTargetType.REQUEST) {
        requestIds.add(r.target_id);
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
              "component_type",
              "units_needed",
              "urgency",
              "area_name",
              "hospital_name",
              "status",
              "patient_note",
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

    return reports.map((r) => {
      let targetSummary: TargetSummary | null = null;

      if (r.target_type === ReportTargetType.USER) {
        const u = userMap.get(r.target_id);
        targetSummary = u
          ? {
              id: u.id,
              type: ReportTargetType.USER,
              label: u.name || u.email,
              details: u.email,
              status: u.is_active ? "ACTIVE" : "BLOCKED",
              extra: {
                role: u.role,
                avatar_url: u.avatar_url,
                phone: u.phone,
              },
            }
          : {
              id: r.target_id,
              type: ReportTargetType.USER,
              label: "Unknown User",
              status: "DELETED",
            };
      } else if (r.target_type === ReportTargetType.REQUEST) {
        const req = reqMap.get(r.target_id);
        const bg = req?.blood_group ? formatBloodGroup(req.blood_group) : "";
        const units = req ? `${req.units_needed} unit${req.units_needed > 1 ? "s" : ""}` : "";
        const location = req?.hospital_name || req?.area_name || "";
        targetSummary = req
          ? {
              id: req.id,
              type: ReportTargetType.REQUEST,
              label: `${bg} (${units}) at ${location}`,
              details: req.patient_note || `Urgency: ${req.urgency}`,
              status: req.status,
              extra: {
                urgency: req.urgency,
                blood_group: req.blood_group,
                blood_group_label: bg,
                hospital_name: req.hospital_name,
                area_name: req.area_name,
              },
            }
          : {
              id: r.target_id,
              type: ReportTargetType.REQUEST,
              label: "Unknown Request",
              status: "DELETED",
            };
      }

      return {
        ...r,
        target: targetSummary,
      };
    });
  }
}
