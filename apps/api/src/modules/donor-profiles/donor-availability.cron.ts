import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DonorProfile } from '../../entities/donor-profile.entity';

@Injectable()
export class DonorAvailabilityCron {
  private readonly logger = new Logger(DonorAvailabilityCron.name);

  constructor(
    @InjectRepository(DonorProfile)
    private readonly donorProfileRepository: Repository<DonorProfile>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Running daily donor availability recompute job...');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.donorProfileRepository
      .createQueryBuilder()
      .update(DonorProfile)
      .set({ is_available: true })
      .where('is_available = false')
      .andWhere('last_donation_date < :ninetyDaysAgo', { ninetyDaysAgo })
      .execute();

    this.logger.log(`Recomputed availability for ${result.affected} donors.`);
  }
}
