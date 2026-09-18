import { Controller, Get, Post, Patch, Body, Query } from "@nestjs/common";
import { DonorProfilesService } from "./donor-profiles.service";
import {
  UpsertDonorProfileDto,
  UpdateDonorProfileDto,
  NearbyDonorsQueryDto,
} from "./dto/donor-profile.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("donor-profiles")
export class DonorProfilesController {
  constructor(private readonly donorProfilesService: DonorProfilesService) {}

  @Post()
  async upsert(@CurrentUser() user: any, @Body() dto: UpsertDonorProfileDto) {
    return this.donorProfilesService.upsert(user.id, dto);
  }

  @Get("me")
  async getMe(@CurrentUser() user: any) {
    return this.donorProfilesService.getMe(user.id);
  }

  @Patch("me")
  async updateMe(@CurrentUser() user: any, @Body() dto: UpdateDonorProfileDto) {
    return this.donorProfilesService.updateMe(user.id, dto);
  }

  @Get("nearby")
  async findNearby(@Query() query: NearbyDonorsQueryDto) {
    const lat = query.lat;
    const lng = query.lng;
    const radiusKm = query.radiusKm ?? 10;
    const profiles = await this.donorProfilesService.findNearby(
      lat,
      lng,
      radiusKm,
      query.bloodGroup,
    );

    return profiles.map((p) => {
      // Return a fuzzed location or just omit exact coordinates if needed,
      // but for map markers to work we usually need some coords.
      // We will slightly fuzz it by rounding to 3 decimal places (~100m)
      if (p.location && p.location.coordinates) {
        p.location.coordinates[0] =
          Math.round(p.location.coordinates[0] * 1000) / 1000;
        p.location.coordinates[1] =
          Math.round(p.location.coordinates[1] * 1000) / 1000;
      }
      return p;
    });
  }
}
