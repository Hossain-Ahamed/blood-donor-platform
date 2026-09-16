import { Injectable, NotFoundException, Inject, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { BloodRequest } from "../../entities/request.entity";
import { CreateRequestDto, NearbyQueryDto } from "./dto/request.dto";
import { RequestStatus } from "@repo/shared";
import { Point } from "geojson";

import { PushSubscriptionsService } from "../push-subscriptions/push-subscriptions.service";
import { DonorProfilesService } from "../donor-profiles/donor-profiles.service";

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @InjectRepository(BloodRequest)
    private readonly requestRepository: Repository<BloodRequest>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly pushSubscriptionsService: PushSubscriptionsService,
    private readonly donorProfilesService: DonorProfilesService,
  ) {}

  async create(userId: string, dto: CreateRequestDto): Promise<BloodRequest> {
    const location: Point = {
      type: "Point",
      coordinates: [dto.lng, dto.lat],
    };

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    const request = this.requestRepository.create({
      requester_id: userId,
      blood_group: dto.blood_group,
      component_type: dto.component_type,
      units_needed: dto.units_needed,
      urgency: dto.urgency,
      location,
      area_name: dto.area_name,
      hospital_name: dto.hospital_name,
      patient_name: dto.patient_name,
      patient_age: dto.patient_age,
      disease: dto.disease,
      needed_time: dto.needed_time ? new Date(dto.needed_time) : undefined,
      patient_note: dto.patient_note,
      contact_phone: dto.contact_phone,
      expires_at: expiresAt,
      status: RequestStatus.OPEN,
    });

    const savedRequest = await this.requestRepository.save(request);

    // Trigger notification async
    this.donorProfilesService
      .findNearby(dto.lat, dto.lng, 10, dto.blood_group)
      .then((donors) => {
        const donorUserIds = donors
          .map((d) => d.user_id)
          .filter((id) => id !== userId); // don't notify the requester themselves
        if (donorUserIds.length > 0) {
          const payload = {
            title: `Urgent: ${dto.blood_group} Blood Needed!`,
            body: `A new request for ${dto.blood_group} blood has been made in ${dto.area_name}.`,
            url: `/requests/${savedRequest.id}`,
          };
          this.pushSubscriptionsService.notifyUsers(donorUserIds, payload);
        }
      })
      .catch((err) => console.error("Failed to notify donors:", err));

    return savedRequest;
  }

  async findOne(id: string): Promise<BloodRequest> {
    const request = await this.requestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException("Request not found");
    }
    return request;
  }

  async findAll(filters: any): Promise<BloodRequest[]> {
    const results = await this.requestRepository.find({
      where: filters,
      order: { created_at: "DESC" },
    });
    return results.map((r) => {
      delete (r as any).contact_phone;
      if (
        r.location &&
        Array.isArray((r.location as any).coordinates) &&
        (r.location as any).coordinates.length >= 2
      ) {
        (r.location as any).coordinates[0] =
          Math.round((r.location as any).coordinates[0] * 1000) / 1000;
        (r.location as any).coordinates[1] =
          Math.round((r.location as any).coordinates[1] * 1000) / 1000;
      }
      return r;
    });
  }

  async findNearby(query: any) {
    this.logger.log(`findNearby called with: ${JSON.stringify(query)}`);
    const lat =
      typeof query.lat === "number"
        ? query.lat
        : parseFloat(query.lat) || 23.7925;
    const lng =
      typeof query.lng === "number"
        ? query.lng
        : parseFloat(query.lng) || 90.4078;
    const rawRadius =
      typeof query.radiusKm === "number"
        ? query.radiusKm
        : parseFloat(query.radiusKm) || 10;
    // Cap radius at 200 km
    const radiusKm = Math.min(200, Math.max(1, rawRadius));
    const bloodGroup =
      query.bloodGroup &&
      query.bloodGroup !== "ALL" &&
      query.bloodGroup !== "all"
        ? query.bloodGroup
        : undefined;

    const cacheKey = `requests:nearby:${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusKm}:${bloodGroup || "all"}`;
    try {
      if (this.cacheManager) {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      }
    } catch (cacheErr) {
      this.logger.warn(`Cache get failed: ${cacheErr}`);
    }

    try {
      // Use PostGIS ST_DWithin
      const radiusMeters = radiusKm * 1000;

      let qb = this.requestRepository
        .createQueryBuilder("request")
        .where("request.status = :status", { status: RequestStatus.OPEN })
        .andWhere(
          `ST_DWithin(request.location, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)`,
        )
        .setParameters({ lng, lat, radiusMeters });

      if (bloodGroup) {
        qb = qb.andWhere("request.blood_group = :bg", { bg: bloodGroup });
      }

      qb.addSelect(
        `ST_Distance(request.location, ST_MakePoint(:lng, :lat)::geography)`,
        "dist",
      );
      qb.orderBy("dist", "ASC");

      const results = await qb.getMany();

      // Remove sensitive fields from list responses
      const sanitizedResults = results.map((r) => {
        delete (r as any).contact_phone;
        if (
          r.location &&
          Array.isArray((r.location as any).coordinates) &&
          (r.location as any).coordinates.length >= 2
        ) {
          (r.location as any).coordinates[0] =
            Math.round((r.location as any).coordinates[0] * 10000) / 10000;
          (r.location as any).coordinates[1] =
            Math.round((r.location as any).coordinates[1] * 10000) / 10000;
        }
        return r;
      });

      try {
        if (this.cacheManager) {
          await this.cacheManager.set(cacheKey, sanitizedResults, 60 * 1000);
        }
      } catch (cacheErr) {
        this.logger.warn(`Cache set failed: ${cacheErr}`);
      }

      return sanitizedResults;
    } catch (err: any) {
      this.logger.error(`Spatial query failed, falling back: ${err.message}`, err.stack);
      
      const fallbackResults = await this.requestRepository.find({
        where: {
          status: RequestStatus.OPEN,
          ...(bloodGroup ? { blood_group: bloodGroup as any } : {}),
        },
        order: { created_at: "DESC" },
        take: 50,
      });

      return fallbackResults.map((r) => {
        delete (r as any).contact_phone;
        return r;
      });
    }
  }
}
