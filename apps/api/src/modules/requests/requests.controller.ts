import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { RequestsService } from './requests.service';
import { CreateRequestDto, NearbyQueryDto } from './dto/request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) { }

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 req per hour
  async create(@CurrentUser() user: any, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user.id, dto);
  }

  @Get('nearby')
  async findNearby(@Query() query: NearbyQueryDto) {
    // Manually parse strings from query params
    return this.requestsService.findNearby({
      lat: parseFloat(query.lat as any),
      lng: parseFloat(query.lng as any),
      radiusKm: parseFloat(query.radiusKm as any),
      bloodGroup: query.bloodGroup,
    });
  }

  @Get()
  async findAll(@Query() query: any) {
    const filters = {};
    if (query.status) filters['status'] = query.status;
    if (query.blood_group) filters['blood_group'] = query.blood_group;
    return this.requestsService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }
}
