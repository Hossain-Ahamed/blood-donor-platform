import { Test, TestingModule } from '@nestjs/testing';
import { DonorProfilesController } from './donor-profiles.controller';

describe('DonorProfilesController', () => {
  let controller: DonorProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonorProfilesController],
    }).compile();

    controller = module.get<DonorProfilesController>(DonorProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
