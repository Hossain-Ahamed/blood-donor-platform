import { Injectable, NotFoundException, Logger, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { BloodRequest } from "../../entities/request.entity";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { RequestStatus } from "@repo/shared";
import { invalidateCacheKeys } from "../../common/utils/cache.util";

@Injectable()
export class AdminRequestsService {
  private readonly logger = new Logger(AdminRequestsService.name);

  constructor(
    @InjectRepository(BloodRequest)
    private requestRepository: Repository<BloodRequest>,
    private auditLogsService: AuditLogsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async findAll(query: any) {
    this.logger.log(
      `Admin findAll called with query: ${JSON.stringify(query)}`,
    );
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const {
      status,
      blood_group,
      start_date,
      end_date,
      lat,
      lng,
      radiusKm,
      requestId,
      search,
      request_id,
    } = query;
    const searchId = (requestId || search || request_id)?.trim();
    const skip = (page - 1) * limit;

    try {
      const qb = this.requestRepository
        .createQueryBuilder("request")
        .withDeleted()
        .leftJoinAndSelect("request.requester", "requester")
        .skip(skip)
        .take(limit);

      if (searchId) {
        qb.andWhere("CAST(request.id AS TEXT) ILIKE :searchId", {
          searchId: `%${searchId}%`,
        });
      }

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
          "dist",
        );
        qb.orderBy("dist", "ASC");
      } else {
        qb.orderBy("request.created_at", "DESC");
      }

      if (status && status !== "all") {
        qb.andWhere("request.status = :status", { status });
      }
      if (blood_group && blood_group !== "all") {
        qb.andWhere("request.blood_group = :blood_group", { blood_group });
      }
      if (start_date) {
        qb.andWhere("request.created_at >= :start_date", { start_date });
      }
      if (end_date) {
        qb.andWhere("request.created_at <= :end_date", { end_date });
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
      this.logger.error(
        `Admin findAll query error, fallback to standard find: ${err.message}`,
        err.stack,
      );

      const where: any = {};
      if (searchId) where.id = searchId;
      if (status && status !== "all") where.status = status;
      if (blood_group && blood_group !== "all") where.blood_group = blood_group;

      const [requests, total] = await this.requestRepository.findAndCount({
        where,
        relations: ["requester"],
        order: { created_at: "DESC" },
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

  async update(adminId: string, id: string, updateData: any) {
    const request = await this.requestRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!request) throw new NotFoundException("Request not found");

    const before = { ...request };

    if (updateData.status) request.status = updateData.status as RequestStatus;
    if (updateData.blood_group) request.blood_group = updateData.blood_group;
    if (updateData.component_type)
      request.component_type = updateData.component_type;
    if (updateData.units_needed !== undefined)
      request.units_needed = updateData.units_needed;
    if (updateData.units_fulfilled !== undefined)
      request.units_fulfilled = updateData.units_fulfilled;
    if (updateData.urgency) request.urgency = updateData.urgency;
    if (updateData.lat !== undefined && updateData.lng !== undefined) {
      request.location = {
        type: "Point",
        coordinates: [Number(updateData.lng), Number(updateData.lat)],
      };
    }
    if (updateData.area_name) request.area_name = updateData.area_name;
    if (updateData.hospital_name !== undefined)
      request.hospital_name = updateData.hospital_name;
    if (updateData.patient_name !== undefined)
      request.patient_name = updateData.patient_name;
    if (updateData.patient_age !== undefined)
      request.patient_age = updateData.patient_age;
    if (updateData.disease !== undefined) request.disease = updateData.disease;
    if (updateData.needed_time !== undefined) {
      request.needed_time = updateData.needed_time
        ? new Date(updateData.needed_time)
        : (null as any);
    }
    if (updateData.patient_note !== undefined)
      request.patient_note = updateData.patient_note;
    if (updateData.contact_phone !== undefined)
      request.contact_phone = updateData.contact_phone;

    const after = { ...request };

    await this.requestRepository.save(request);
    await invalidateCacheKeys(this.cacheManager, [
      `profile:user:${request.requester_id}`,
      "admin:dashboard:stats",
    ]);

    let action = "UPDATE_REQUEST";
    if (updateData.status) {
      if (request.status === RequestStatus.CANCELLED) {
        action = "CANCEL_REQUEST";
      } else if (request.status === RequestStatus.OPEN) {
        action = "APPROVE_REQUEST";
      } else if (request.status === RequestStatus.FULFILLED) {
        action = "FULFILL_REQUEST";
      }
    }

    try {
      await this.auditLogsService.record(adminId, action, "REQUEST", id, {
        before,
        after,
      });
    } catch {
      // audit log failover
    }

    return request;
  }

  async delete(adminId: string, id: string) {
    const request = await this.requestRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!request) throw new NotFoundException("Request not found");

    const before = { ...request };
    await this.requestRepository.softDelete(id);
    await invalidateCacheKeys(this.cacheManager, [
      `profile:user:${request.requester_id}`,
      "admin:dashboard:stats",
    ]);

    try {
      await this.auditLogsService.record(
        adminId,
        "DELETE_REQUEST",
        "REQUEST",
        id,
        { before },
      );
    } catch {
      // audit log failover
    }

    return { success: true, message: "Request deleted successfully" };
  }
}
