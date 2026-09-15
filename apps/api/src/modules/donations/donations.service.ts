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
      where: { response: { donor_id: userId } },
      relations: ['response', 'response.request'],
      order: { created_at: 'DESC' },
    });
  }

  async confirm(donationId: string, userId: string, confirmed: boolean): Promise<Donation> {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
      relations: ['response', 'response.request'],
    });

    if (!donation) throw new NotFoundException('Donation not found');

    const isDonor = donation.response.donor_id === userId;
    const isRequester = donation.response.request.requester_id === userId;

    if (!isDonor && !isRequester) {
      throw new ForbiddenException('You are not authorized to confirm this donation');
    }

    if (isDonor) {
      donation.confirmed_by_donor = confirmed;
    } else {
      donation.confirmed_by_requester = confirmed;
    }

    const updated = await this.donationRepository.save(donation);

    // If both confirmed, update donor profile
    if (updated.confirmed_by_donor && updated.confirmed_by_requester) {
      const profile = await this.donorProfileRepository.findOne({ where: { user_id: donation.response.donor_id } });
      if (profile) {
        profile.last_donation_date = updated.donation_date;
        profile.is_available = false; // Immediate trigger
        await this.donorProfileRepository.save(profile);
      }
    }

    return updated;
  }
}
