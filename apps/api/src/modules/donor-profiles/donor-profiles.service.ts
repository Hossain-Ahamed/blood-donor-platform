import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DonorProfile } from "../../entities/donor-profile.entity";
import {
  UpsertDonorProfileDto,
  UpdateDonorProfileDto,
} from "./dto/donor-profile.dto";
import { Point } from "geojson";

@Injectable()
export class DonorProfilesService {
  constructor(
    @InjectRepository(DonorProfile)
    private readonly donorProfileRepository: Repository<DonorProfile>,
  ) {}

  private calculateAvailability(
    lastDonationDate: string | Date | undefined,
  ): boolean {
    if (!lastDonationDate) return true;
    const date = new Date(lastDonationDate);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return date < ninetyDaysAgo;
  }

  async getMe(userId: string): Promise<DonorProfile> {
    const profile = await this.donorProfileRepository.findOne({
      where: { user_id: userId },
    });
    if (!profile) {
      throw new NotFoundException("Donor profile not found");
    }
    return profile;
  }

  async upsert(
    userId: string,
    dto: UpsertDonorProfileDto,
  ): Promise<DonorProfile> {
    let profile = await this.donorProfileRepository.findOne({
      where: { user_id: userId },
    });

    const location: Point = {
      type: "Point",
      coordinates: [dto.lng, dto.lat],
    };

    const isAvailable = this.calculateAvailability(dto.last_donation_date);

    if (profile) {
      profile.blood_group = dto.blood_group;
      profile.location = location;
      profile.area_name = dto.area_name;
      if (dto.bio !== undefined) profile.bio = dto.bio;
      if (dto.last_donation_date !== undefined) {
        profile.last_donation_date = new Date(dto.last_donation_date);
        profile.is_available = isAvailable;
      }
    } else {
      profile = this.donorProfileRepository.create({
        user_id: userId,
        blood_group: dto.blood_group,
        location,
        area_name: dto.area_name,
        bio: dto.bio,
        last_donation_date: dto.last_donation_date
          ? new Date(dto.last_donation_date)
          : null,
        is_available: isAvailable,
      });
    }

    return this.donorProfileRepository.save(profile);
  }

  async updateMe(
    userId: string,
    dto: UpdateDonorProfileDto,
  ): Promise<DonorProfile> {
    const profile = await this.getMe(userId);

    if (dto.blood_group) profile.blood_group = dto.blood_group;
    if (dto.area_name) profile.area_name = dto.area_name;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.lat !== undefined && dto.lng !== undefined) {
      profile.location = {
        type: "Point",
        coordinates: [dto.lng, dto.lat],
      };
    }
    if (dto.last_donation_date !== undefined) {
      profile.last_donation_date = dto.last_donation_date
        ? new Date(dto.last_donation_date)
        : null;
      profile.is_available = this.calculateAvailability(dto.last_donation_date);
    }
    if (dto.is_available !== undefined) {
      profile.is_available = dto.is_available;
    }

    return this.donorProfileRepository.save(profile);
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    bloodGroup?: string,
  ): Promise<DonorProfile[]> {
    const radiusMeters = radiusKm * 1000;

    let qb = this.donorProfileRepository
      .createQueryBuilder("donor")
      .where("donor.is_available = :isAvailable", { isAvailable: true })
      .andWhere(
        `ST_DWithin(donor.location, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)`,
      )
      .setParameters({ lng, lat, radiusMeters });

    if (bloodGroup) {
      qb = qb.andWhere("donor.blood_group = :bg", { bg: bloodGroup });
    }

    qb = qb.orderBy(
      `ST_Distance(donor.location, ST_MakePoint(:lng, :lat)::geography)`,
      "ASC",
    );

    return qb.getMany();
  }
}
