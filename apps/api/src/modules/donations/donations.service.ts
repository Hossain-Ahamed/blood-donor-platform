import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation } from '../../entities/donation.entity';
import { DonorProfile } from '../../entities/donor-profile.entity';
import { BloodRequest } from '../../entities/request.entity';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonorProfile)
    private readonly donorProfileRepository: Repository<DonorProfile>,
    @InjectRepository(BloodRequest)
    private readonly requestRepository: Repository<BloodRequest>,
  ) { }

  async getMyDonations(userId: string): Promise<Donation[]> {
    return this.donationRepository.find({
      where: { donor_id: userId },
      relations: ['request'],
      order: { created_at: 'DESC' },
    });
  }

  async confirm(donationId: string, userId: string, confirmed: boolean): Promise<Donation> {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
      relations: ['request'],
    });

    if (!donation) throw new NotFoundException('Donation not found');

    const isDonor = donation.donor_id === userId;
    const isRequester = donation.request.requester_id === userId;

    if (!isDonor && !isRequester) {
      throw new ForbiddenException('You are not authorized to confirm this donation');
    }

    if (isDonor) {
      donation.donor_confirmed = confirmed;
    } else {
      donation.requester_confirmed = confirmed;
    }

    const updated = await this.donationRepository.save(donation);

    // If both confirmed, update donor profile
    if (updated.donor_confirmed && updated.requester_confirmed) {
      const profile = await this.donorProfileRepository.findOne({ where: { user_id: donation.donor_id } });
      if (profile) {
        profile.last_donation_date = updated.donation_date;
        profile.is_available = false; // Immediate trigger
        await this.donorProfileRepository.save(profile);
      }
    }

    return updated;
  }
}
