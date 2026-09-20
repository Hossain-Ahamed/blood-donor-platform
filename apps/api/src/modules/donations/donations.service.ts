import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Donation } from '../../entities/donation.entity';
import { DonorProfile } from '../../entities/donor-profile.entity';
import { BloodRequest } from '../../entities/request.entity';
import { Response } from '../../entities/response.entity';
import { ResponseStatus } from '@repo/shared';
import { invalidateCacheKeys } from '../../common/utils/cache.util';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonorProfile)
    private readonly donorProfileRepository: Repository<DonorProfile>,
    @InjectRepository(BloodRequest)
    private readonly requestRepository: Repository<BloodRequest>,
    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getMyDonations(userId: string): Promise<Donation[]> {
    return this.donationRepository
      .createQueryBuilder('donation')
      .innerJoinAndSelect('donation.response', 'response')
      .leftJoinAndSelect('response.request', 'request')
      .where('response.donor_id = :userId', { userId })
      .orderBy('donation.created_at', 'DESC')
      .getMany();
  }

  async confirmByResponse(
    responseId: string,
    userId: string,
    confirmed = true,
  ): Promise<Donation> {
    let donation = await this.donationRepository.findOne({
      where: { response_id: responseId },
      relations: ['response', 'response.request'],
    });

    if (!donation) {
      const response = await this.responseRepository.findOne({
        where: { id: responseId },
        relations: ['request'],
      });
      if (!response) throw new NotFoundException('Response not found');
      if (response.status !== ResponseStatus.ACCEPTED) {
        throw new BadRequestException(
          'Only accepted donation offers can be confirmed as completed donations',
        );
      }
      donation = this.donationRepository.create({
        response_id: response.id,
        donation_date: new Date(),
        response,
      });
      donation = await this.donationRepository.save(donation);
    }

    return this.confirm(donation.id, userId, confirmed);
  }

  async confirm(
    donationId: string,
    userId: string,
    confirmed = true,
  ): Promise<Donation> {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
      relations: ['response', 'response.request'],
    });

    if (!donation) throw new NotFoundException('Donation not found');

    const isDonor = donation.response.donor_id === userId;
    const isRequester = donation.response.request.requester_id === userId;

    if (!isDonor && !isRequester) {
      throw new ForbiddenException(
        'You are not authorized to confirm this donation',
      );
    }

    if (isDonor) {
      donation.confirmed_by_donor = confirmed;
    } else {
      donation.confirmed_by_requester = confirmed;
    }

    const updated = await this.donationRepository.save(donation);

    // Single-party confirmation rule: if either party confirms, mark donation completed
    const isConfirmed =
      updated.confirmed_by_donor || updated.confirmed_by_requester;
    if (isConfirmed) {
      const profile = await this.donorProfileRepository.findOne({
        where: { user_id: donation.response.donor_id },
      });
      if (profile) {
        profile.last_donation_date = updated.donation_date || new Date();
        profile.is_available = false; // Cooldown trigger
        await this.donorProfileRepository.save(profile);
      }
    }

    // Invalidate profile caches for donor and requester so updated donation history & cooldown reflect instantly
    const donorId = donation.response?.donor_id;
    const requesterId = donation.response?.request?.requester_id;
    const keysToInvalidate: string[] = [];
    if (donorId) keysToInvalidate.push(`profile:user:${donorId}`);
    if (requesterId) keysToInvalidate.push(`profile:user:${requesterId}`);
    if (keysToInvalidate.length > 0) {
      await invalidateCacheKeys(this.cacheManager, keysToInvalidate);
    }

    return updated;
  }
}
