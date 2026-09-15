import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

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
}

