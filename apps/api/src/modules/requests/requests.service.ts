import { Injectable, NotFoundException, Inject } from "@nestjs/common";
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
    return this.requestRepository.find({
    const results = await this.requestRepository.find({
      where: filters,
      order: { created_at: "DESC" },
    });
    return results.map(r => {
      delete (r as any).contact_phone;
      if (r.location && (r.location as any).coordinates) {
        (r.location as any).coordinates[0] = Math.round((r.location as any).coordinates[0] * 1000) / 1000;
        (r.location as any).coordinates[1] = Math.round((r.location as any).coordinates[1] * 1000) / 1000;
      }
      return r;
    });
  }

  async findNearby(query: NearbyQueryDto) {
    const cacheKey = `requests:nearby:${query.lat.toFixed(2)}:${query.lng.toFixed(2)}:${query.radiusKm}:${query.bloodGroup || "all"}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Use PostGIS ST_DWithin
    // 1 degree is approx 111km, but ST_DWithin on geography uses meters
    const radiusMeters = query.radiusKm * 1000;

    let qb = this.requestRepository
      .createQueryBuilder("request")
      .where("request.status = :status", { status: RequestStatus.OPEN })
      .andWhere(
        `ST_DWithin(request.location, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)`,
      )
      .setParameters({ lng: query.lng, lat: query.lat, radiusMeters });

    if (query.bloodGroup) {
      qb = qb.andWhere("request.blood_group = :bg", { bg: query.bloodGroup });
    }

    qb = qb.orderBy(
      `ST_Distance(request.location, ST_MakePoint(:lng, :lat)::geography)`,
      "ASC",
    );

    const results = await qb.getMany();
    await this.cacheManager.set(cacheKey, results, 60 * 1000); // 1 minute cache
    
    // Remove sensitive fields from list responses
    const sanitizedResults = results.map(r => {
      delete (r as any).contact_phone;
      if (r.location && (r.location as any).coordinates) {
        (r.location as any).coordinates[0] = Math.round((r.location as any).coordinates[0] * 1000) / 1000;
        (r.location as any).coordinates[1] = Math.round((r.location as any).coordinates[1] * 1000) / 1000;
      }
      return r;
    });

    return results;
    await this.cacheManager.set(cacheKey, sanitizedResults, 60 * 1000); // 1 minute cache

    return sanitizedResults;
  }
}
