import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { Donation } from '../../entities/donation.entity';
import { DonorProfile } from '../../entities/donor-profile.entity';
import { BloodRequest } from '../../entities/request.entity';
import { Response } from '../../entities/response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, DonorProfile, BloodRequest, Response])],
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule { }
