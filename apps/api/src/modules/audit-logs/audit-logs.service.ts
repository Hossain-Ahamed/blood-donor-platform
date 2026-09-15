import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../../entities/audit-log.entity";

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

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
    return this.auditLogRepository.save(log);
  }

  async findAll(query: any) {
    const {
      page = 1,
      limit = 10,
      admin_id,
      action,
      target_type,
      start_date,
      end_date,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepository
      .createQueryBuilder("audit")
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

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
