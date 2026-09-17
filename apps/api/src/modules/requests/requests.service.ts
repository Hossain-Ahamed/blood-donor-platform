import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { BloodRequest } from "../../entities/request.entity";
import { User } from "../../entities/user.entity";
import {
  CreateRequestDto,
  UpdateRequestDto,
  NearbyQueryDto,
} from "./dto/request.dto";
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly pushSubscriptionsService: PushSubscriptionsService,
    private readonly donorProfilesService: DonorProfilesService,
  ) {}

  async create(userId: string, dto: CreateRequestDto): Promise<BloodRequest> {
    const userProfile = await this.donorProfilesService.findByUserId(userId);
    if (!userProfile || !userProfile.blood_group) {
      throw new BadRequestException(
        "You must complete your profile with your blood group and location before creating a blood request",
      );
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const userPhone = user?.phone?.trim() || userProfile.user?.phone?.trim();
    if (!userPhone) {
      throw new BadRequestException(
        "You must add a contact phone number to your profile before creating a blood request",
      );
    }

    const contactPhone = dto.contact_phone?.trim() || userPhone;

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
      contact_phone: contactPhone,
      expires_at: expiresAt,
      status: RequestStatus.OPEN,
    });

    const savedRequest = await this.requestRepository.save(request);

    // Trigger notification async
    this.donorProfilesService
      .findNearby(dto.lat, dto.lng, 10, dto.blood_group)
      .then((donors) => {
        this.logger.log(
          `Found ${donors.length} nearby matching donors for ${dto.blood_group} request within 10km`,
        );
        const donorUserIds = donors
          .map((d) => d.user_id)
          .filter((id) => id !== userId); // don't notify the requester themselves

        if (donorUserIds.length === 0) {
          this.logger.log(
            `No other eligible donors to notify (total found: ${donors.length}, requester excluded: ${userId})`,
          );
          return;
        }

        const payload = {
          title: `Urgent: ${dto.blood_group} Blood Needed!`,
          body: `A new request for ${dto.blood_group} blood has been made in ${dto.area_name}.`,
          url: `/requests/${savedRequest.id}`,
        };
        this.logger.log(
          `Dispatching push notifications to ${donorUserIds.length} donor(s)`,
        );
        this.pushSubscriptionsService.notifyUsers(donorUserIds, payload);
      })
      .catch((err) => this.logger.error("Failed to notify donors:", err));

    return savedRequest;
  }

  async findOne(id: string): Promise<BloodRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ["requester"],
    });
    if (!request) {
      throw new NotFoundException("Request not found");
    }
    if (this.donorProfilesService?.findByUserId) {
      try {
        const requesterProfile = await this.donorProfilesService.findByUserId(
          request.requester_id,
        );
        if (requesterProfile) {
          (request as any).requester_profile = {
            area_name: requesterProfile.area_name,
            blood_group: requesterProfile.blood_group,
            is_available: requesterProfile.is_available,
            last_donation_date: requesterProfile.last_donation_date,
          };
        }
      } catch (e) {
        this.logger.warn(
          `Failed to fetch requester profile for ${request.requester_id}:`,
          e,
        );
      }
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
      this.logger.error(
        `Spatial query failed, falling back: ${err.message}`,
        err.stack,
      );

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

  async findMyRequests(userId: string): Promise<BloodRequest[]> {
    return this.requestRepository.find({
      where: { requester_id: userId },
      order: { created_at: "DESC" },
    });
  }

  async update(
    userId: string,
    userRole: string,
    id: string,
    dto: UpdateRequestDto,
  ): Promise<BloodRequest> {
    const request = await this.requestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException("Request not found");
    }

    if (request.requester_id !== userId && userRole !== "ADMIN") {
      throw new ForbiddenException(
        "You are not authorized to update this blood request",
      );
    }

    if (dto.blood_group !== undefined) {
      request.blood_group = dto.blood_group;
    }
    if (dto.component_type !== undefined) {
      request.component_type = dto.component_type;
    }
    if (dto.units_needed !== undefined) {
      request.units_needed = dto.units_needed;
    }
    if (dto.units_fulfilled !== undefined) {
      request.units_fulfilled = dto.units_fulfilled;
    }
    if (dto.urgency !== undefined) {
      request.urgency = dto.urgency;
    }
    if (dto.lat !== undefined && dto.lng !== undefined) {
      request.location = {
        type: "Point",
        coordinates: [dto.lng, dto.lat],
      };
    }
    if (dto.area_name !== undefined) {
      request.area_name = dto.area_name;
    }
    if (dto.hospital_name !== undefined) {
      request.hospital_name = dto.hospital_name;
    }
    if (dto.patient_name !== undefined) {
      request.patient_name = dto.patient_name;
    }
    if (dto.patient_age !== undefined) {
      request.patient_age = dto.patient_age;
    }
    if (dto.disease !== undefined) {
      request.disease = dto.disease;
    }
    if (dto.needed_time !== undefined) {
      request.needed_time = dto.needed_time
        ? new Date(dto.needed_time)
        : (null as any);
    }
    if (dto.patient_note !== undefined) {
      request.patient_note = dto.patient_note;
    }
    if (dto.contact_phone !== undefined) {
      request.contact_phone = dto.contact_phone;
    }
    if (dto.status !== undefined) {
      request.status = dto.status;
    }

    const saved = await this.requestRepository.save(request);

    try {
      if (
        this.cacheManager &&
        typeof (this.cacheManager as any).reset === "function"
      ) {
        await (this.cacheManager as any).reset();
      }
    } catch {
      // cache reset failover
    }

    return saved;
  }

  async delete(
    userId: string,
    userRole: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const request = await this.requestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException("Request not found");
    }

    if (request.requester_id !== userId && userRole !== "ADMIN") {
      throw new ForbiddenException(
        "You are not authorized to delete this blood request",
      );
    }

    await this.requestRepository.softDelete(id);

    try {
      if (
        this.cacheManager &&
        typeof (this.cacheManager as any).reset === "function"
      ) {
        await (this.cacheManager as any).reset();
      }
    } catch {
      // cache reset failover
    }

    return {
      success: true,
      message: "Request deleted successfully",
    };
  }
}
