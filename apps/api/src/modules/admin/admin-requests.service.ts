import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BloodRequest } from '../../entities/request.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RequestStatus } from '@repo/shared';

@Injectable()
export class AdminRequestsService {
  private readonly logger = new Logger(AdminRequestsService.name);

  constructor(
    @InjectRepository(BloodRequest) private requestRepository: Repository<BloodRequest>,
    private auditLogsService: AuditLogsService,
  ) { }

  async findAll(query: any) {
    this.logger.log(`Admin findAll called with query: ${JSON.stringify(query)}`);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const { status, blood_group, start_date, end_date, lat, lng, radiusKm } = query;
    const skip = (page - 1) * limit;

    try {
      const qb = this.requestRepository.createQueryBuilder('request')
        .withDeleted()
        .leftJoinAndSelect('request.requester', 'requester')
        .skip(skip)
        .take(limit);

      if (
        lat !== undefined &&
        lng !== undefined &&
        radiusKm !== undefined &&
        !isNaN(Number(lat)) &&
        !isNaN(Number(lng)) &&
        !isNaN(Number(radiusKm))
      ) {
        // Cap radius at 200 km max
        const cappedRadius = Math.min(200, Math.max(1, Number(radiusKm)));
        const radiusMeters = cappedRadius * 1000;

        qb.andWhere(
          `ST_DWithin(request.location, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)`,
          { lng: Number(lng), lat: Number(lat), radiusMeters },
        );
        qb.addSelect(
          `ST_Distance(request.location, ST_MakePoint(:lng, :lat)::geography)`,
          'dist',
        );
        qb.orderBy('dist', 'ASC');
      } else {
        qb.orderBy('request.created_at', 'DESC');
      }

      if (status && status !== 'all') {
        qb.andWhere('request.status = :status', { status });
      }
      if (blood_group && blood_group !== 'all') {
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
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (err: any) {
      this.logger.error(`Admin findAll query error, fallback to standard find: ${err.message}`, err.stack);
      
      const where: any = {};
      if (status && status !== 'all') where.status = status;
      if (blood_group && blood_group !== 'all') where.blood_group = blood_group;

      const [requests, total] = await this.requestRepository.findAndCount({
        where,
        relations: ['requester'],
        order: { created_at: 'DESC' },
        skip,
        take: limit,
        withDeleted: true,
      });

      return {
        data: requests,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }
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

    let action = 'UPDATE_REQUEST_STATUS';
    if (after.status === RequestStatus.CANCELLED) {
      action = 'CANCEL_REQUEST';
    } else if (after.status === RequestStatus.OPEN) {
      action = 'APPROVE_REQUEST';
    } else if (after.status === RequestStatus.FULFILLED) {
      action = 'FULFILL_REQUEST';
    }

    try {
      await this.auditLogsService.record(adminId, action, 'REQUEST', id, { before, after });
    } catch {
      // audit log failover
    }

    return request;
  }
}
