import { Test, TestingModule } from '@nestjs/testing';
import { DonorProfilesService } from './donor-profiles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DonorProfile } from '../../entities/donor-profile.entity';

describe('DonorProfilesService', () => {
  let service: DonorProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonorProfilesService,
        {
          provide: getRepositoryToken(DonorProfile),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<DonorProfilesService>(DonorProfilesService);
  });

  describe('calculateAvailability', () => {
    it('should return true if lastDonationDate is undefined', () => {
      // @ts-ignore - access private method for testing
      const result = service.calculateAvailability(undefined);
      expect(result).toBe(true);
    });

    it('should return true if lastDonationDate is more than 90 days ago', () => {
      const moreThan90DaysAgo = new Date();
      moreThan90DaysAgo.setDate(moreThan90DaysAgo.getDate() - 91);
      // @ts-ignore
      const result = service.calculateAvailability(moreThan90DaysAgo);
      expect(result).toBe(true);
    });

    it('should return false if lastDonationDate is exactly 90 days ago', () => {
      const exactly90DaysAgo = new Date();
      exactly90DaysAgo.setDate(exactly90DaysAgo.getDate() - 90);
      // @ts-ignore
      const result = service.calculateAvailability(exactly90DaysAgo);
      expect(result).toBe(false);
    });

    it('should return false if lastDonationDate is less than 90 days ago', () => {
      const lessThan90DaysAgo = new Date();
      lessThan90DaysAgo.setDate(lessThan90DaysAgo.getDate() - 89);
      // @ts-ignore
      const result = service.calculateAvailability(lessThan90DaysAgo);
      expect(result).toBe(false);
    });
  });
});
