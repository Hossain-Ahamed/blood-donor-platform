import { Test, TestingModule } from '@nestjs/testing';
import { DonorProfilesService } from './donor-profiles.service';

describe('DonorProfilesService', () => {
  let service: DonorProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DonorProfilesService],
    }).compile();

    service = module.get<DonorProfilesService>(DonorProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
