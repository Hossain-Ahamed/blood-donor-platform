import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BloodRequest } from '../../entities/request.entity';
import { CreateRequestDto, NearbyQueryDto } from './dto/request.dto';
import { RequestStatus } from '@repo/shared';
import { Point } from 'geojson';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(BloodRequest)
    private readonly requestRepository: Repository<BloodRequest>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(userId: string, dto: CreateRequestDto): Promise<BloodRequest> {
    const location: Point = {
      type: 'Point',
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

    return this.requestRepository.save(request);
  }

  async findOne(id: string): Promise<BloodRequest> {
    const request = await this.requestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Request not found');
    }
    return request;
  }

  async findAll(filters: any): Promise<BloodRequest[]> {
    return this.requestRepository.find({ where: filters, order: { created_at: 'DESC' } });
  }

  async findNearby(query: NearbyQueryDto) {
    const cacheKey = `requests:nearby:${query.lat.toFixed(2)}:${query.lng.toFixed(2)}:${query.radiusKm}:${query.bloodGroup || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Use PostGIS ST_DWithin
    // 1 degree is approx 111km, but ST_DWithin on geography uses meters
    const radiusMeters = query.radiusKm * 1000;
    
    let qb = this.requestRepository.createQueryBuilder('request')
      .where('request.status = :status', { status: RequestStatus.OPEN })
      .andWhere(`ST_DWithin(request.location, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)`)
      .setParameters({ lng: query.lng, lat: query.lat, radiusMeters });

    if (query.bloodGroup) {
      qb = qb.andWhere('request.blood_group = :bg', { bg: query.bloodGroup });
    }

    qb = qb.orderBy(`ST_Distance(request.location, ST_MakePoint(:lng, :lat)::geography)`, 'ASC');

    const results = await qb.getMany();
    await this.cacheManager.set(cacheKey, results, 60 * 1000); // 1 minute cache
    
    return results;
  }
}
