import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BloodRequest } from '../../entities/request.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RequestStatus } from '@repo/shared';

@Injectable()
export class AdminRequestsService {
  constructor(
    @InjectRepository(BloodRequest) private requestRepository: Repository<BloodRequest>,
    private auditLogsService: AuditLogsService,
  ) { }

  async findAll(query: any) {
    const { page = 1, limit = 10, status, blood_group, start_date, end_date } = query;
    const skip = (page - 1) * limit;

    const qb = this.requestRepository.createQueryBuilder('request')
      .withDeleted()
      .leftJoinAndSelect('request.requester', 'requester')
      .skip(skip)
      .take(limit)
      .orderBy('request.created_at', 'DESC');

    if (status) {
      qb.andWhere('request.status = :status', { status });
    }
    if (blood_group) {
      qb.andWhere('request.blood_group = :blood_group', { blood_group });
    }
    if (start_date) {
      qb.andWhere('request.created_at >= :start_date', { start_date });
    }
    if (end_date) {
      qb.andWhere('request.created_at <= :end_date', { end_date });
    }

    const [requests, total] = await qb.getManyAndCount();

    return {
      data: requests,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async update(adminId: string, id: string, updateData: { status: string }) {
    const request = await this.requestRepository.findOne({ 
      where: { id },
      withDeleted: true
    });
    if (!request) throw new NotFoundException('Request not found');

    const before = { status: request.status };

    if (updateData.status) {
      request.status = updateData.status as RequestStatus;
    }

    const after = { status: request.status };

    await this.requestRepository.save(request);

    let action = 'UPDATE_REQUEST';
    if (after.status === RequestStatus.CANCELLED) {
      action = 'CANCEL_REQUEST';
    }

    await this.auditLogsService.record(adminId, action, 'REQUEST', id, { before, after });

    return request;
  }
}

