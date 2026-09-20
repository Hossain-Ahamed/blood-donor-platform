import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { DonorProfile } from "../../entities/donor-profile.entity";
import { User } from "../../entities/user.entity";
import {
  UpsertDonorProfileDto,
  UpdateDonorProfileDto,
} from "./dto/donor-profile.dto";
import { Point } from "geojson";
import { invalidateCacheKeys } from "../../common/utils/cache.util";

export function calculateAge(
  dob: string | Date | null | undefined,
): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

@Injectable()
export class DonorProfilesService {
  constructor(
    @InjectRepository(DonorProfile)
    private readonly donorProfileRepository: Repository<DonorProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
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
      relations: ["user"],
    });
    if (!profile) {
      throw new NotFoundException("Donor profile not found");
    }
    if (profile.date_of_birth) {
      profile.age = calculateAge(profile.date_of_birth) ?? profile.age;
    }
    return profile;
  }

  async findByUserId(userId: string): Promise<DonorProfile | null> {
    const profile = await this.donorProfileRepository.findOne({
      where: { user_id: userId },
      relations: ["user"],
    });
    if (profile && profile.date_of_birth) {
      profile.age = calculateAge(profile.date_of_birth) ?? profile.age;
    }
    return profile;
  }

  async upsert(
    userId: string,
    dto: UpsertDonorProfileDto,
  ): Promise<DonorProfile> {
    const userUpdates: Partial<User> = {};
    if (dto.name) userUpdates.name = dto.name;
    if (dto.phone !== undefined) userUpdates.phone = dto.phone;
    if (Object.keys(userUpdates).length > 0) {
      await this.userRepository.update(userId, userUpdates);
    }

    let profile = await this.donorProfileRepository.findOne({
      where: { user_id: userId },
      relations: ["user"],
    });

    const location: Point = {
      type: "Point",
      coordinates: [dto.lng, dto.lat],
    };

    const isAvailable = this.calculateAvailability(dto.last_donation_date);
    const dob = dto.date_of_birth ? new Date(dto.date_of_birth) : undefined;
    const computedAge = dob ? (calculateAge(dob) ?? dto.age) : dto.age;

    if (profile) {
      profile.blood_group = dto.blood_group;
      profile.location = location;
      profile.area_name = dto.area_name;
      if (dob !== undefined) profile.date_of_birth = dob;
      if (computedAge !== undefined) profile.age = computedAge;
      if (dto.religion !== undefined) profile.religion = dto.religion;
      if (dto.health_notes !== undefined)
        profile.health_notes = dto.health_notes;
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
        date_of_birth: dob,
        age: computedAge,
        religion: dto.religion,
        health_notes: dto.health_notes,
        bio: dto.bio,
        last_donation_date: dto.last_donation_date
          ? new Date(dto.last_donation_date)
          : null,
        is_available: isAvailable,
      });
    }

    const saved = await this.donorProfileRepository.save(profile);
    if (saved.date_of_birth) {
      saved.age = calculateAge(saved.date_of_birth) ?? saved.age;
    }
    await invalidateCacheKeys(this.cacheManager, [`profile:user:${userId}`]);
    return saved;
  }

  async updateMe(
    userId: string,
    dto: UpdateDonorProfileDto,
  ): Promise<DonorProfile> {
    const userUpdates: Partial<User> = {};
    if (dto.name) userUpdates.name = dto.name;
    if (dto.phone !== undefined) userUpdates.phone = dto.phone;
    if (Object.keys(userUpdates).length > 0) {
      await this.userRepository.update(userId, userUpdates);
    }

    const profile = await this.getMe(userId);

    if (dto.blood_group) profile.blood_group = dto.blood_group;
    if (dto.area_name) profile.area_name = dto.area_name;
    if (dto.date_of_birth !== undefined) {
      profile.date_of_birth = dto.date_of_birth
        ? new Date(dto.date_of_birth)
        : (null as any);
      profile.age = calculateAge(profile.date_of_birth) ?? profile.age;
    } else if (dto.age !== undefined) {
      profile.age = dto.age;
    }
    if (dto.religion !== undefined) profile.religion = dto.religion;
    if (dto.health_notes !== undefined) profile.health_notes = dto.health_notes;
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

    const saved = await this.donorProfileRepository.save(profile);
    if (saved.date_of_birth) {
      saved.age = calculateAge(saved.date_of_birth) ?? saved.age;
    }
    await invalidateCacheKeys(this.cacheManager, [`profile:user:${userId}`]);
    return saved;
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

    qb = qb.addSelect(
      `ST_Distance(donor.location, ST_MakePoint(:lng, :lat)::geography)`,
      "dist",
    );
    qb = qb.orderBy("dist", "ASC");

    const list = await qb.getMany();
    return list.map((d) => {
      if (d.date_of_birth) {
        d.age = calculateAge(d.date_of_birth) ?? d.age;
      }
      return d;
    });
  }
}
