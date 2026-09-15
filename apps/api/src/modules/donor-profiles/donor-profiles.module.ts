import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonorProfilesService } from './donor-profiles.service';
import { DonorProfilesController } from './donor-profiles.controller';
import { DonorProfile } from '../../entities/donor-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DonorProfile])],
  controllers: [DonorProfilesController],
  providers: [DonorProfilesService],
  exports: [DonorProfilesService],
})
export class DonorProfilesModule {}
