import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonorProfilesService } from './donor-profiles.service';
import { DonorProfilesController } from './donor-profiles.controller';
import { DonorProfile } from '../../entities/donor-profile.entity';
import { DonorAvailabilityCron } from './donor-availability.cron';

@Module({
  imports: [TypeOrmModule.forFeature([DonorProfile])],
  controllers: [DonorProfilesController],
  providers: [DonorProfilesService, DonorAvailabilityCron],
  exports: [DonorProfilesService],
})
export class DonorProfilesModule { }
