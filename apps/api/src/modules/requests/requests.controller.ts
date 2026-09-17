import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { RequestsService } from "./requests.service";
import {
  CreateRequestDto,
  UpdateRequestDto,
  NearbyQueryDto,
} from "./dto/request.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@Controller("requests")
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Throttle({
    default: {
      limit: process.env.REQUEST_RATE_LIMIT_MAX
        ? parseInt(process.env.REQUEST_RATE_LIMIT_MAX, 10)
        : 30,
      ttl: 3600000,
    },
  }) // 30 req per hour per user (configurable via REQUEST_RATE_LIMIT_MAX)
  async create(@CurrentUser() user: any, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user.id, dto);
  }

  @Public()
  @Get("nearby")
  async findNearby(@Query() query: NearbyQueryDto) {
    return this.requestsService.findNearby(query);
  }

  @Get("me")
  async findMyRequests(@CurrentUser() user: any) {
    return this.requestsService.findMyRequests(user.id);
  }

  @Public()
  @Get()
  async findAll(@Query() query: any) {
    const filters = {};
    if (query.status) filters["status"] = query.status;
    if (query.blood_group) filters["blood_group"] = query.blood_group;
    return this.requestsService.findAll(filters);
  }

  @Public()
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.requestsService.findOne(id);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requestsService.update(user.id, user.role, id, dto);
  }

  @Delete(":id")
  async delete(@CurrentUser() user: any, @Param("id") id: string) {
    return this.requestsService.delete(user.id, user.role, id);
  }
}
