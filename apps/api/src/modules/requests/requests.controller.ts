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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { RequestsService } from "./requests.service";
import {
  CreateRequestDto,
  UpdateRequestDto,
  NearbyQueryDto,
  QueryRequestsDto,
} from "./dto/request.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Requests")
@ApiBearerAuth()
@Controller("requests")
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: "Create an emergency blood request" })
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
  @ApiOperation({ summary: "Find blood requests nearby coordinates within radius" })
  async findNearby(@Query() query: NearbyQueryDto) {
    return this.requestsService.findNearby(query);
  }

  @Get("me")
  @ApiOperation({ summary: "Get current user's blood requests" })
  async findMyRequests(@CurrentUser() user: any) {
    return this.requestsService.findMyRequests(user.id);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "List blood requests with optional status and blood group filters (paginated)" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of blood requests with metadata",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: { type: "object" },
        },
        meta: {
          type: "object",
          properties: {
            total: { type: "number", example: 42 },
            page: { type: "number", example: 1 },
            limit: { type: "number", example: 20 },
            totalPages: { type: "number", example: 3 },
          },
        },
      },
    },
  })
  async findAll(@Query() query: QueryRequestsDto) {
    const filters = {};
    if (query.status) filters["status"] = query.status;
    if (query.blood_group) filters["blood_group"] = query.blood_group;
    return this.requestsService.findAll(filters, query.limit, query.page);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get single blood request details" })
  @ApiParam({ name: "id", description: "Request UUID" })
  async findOne(@Param("id") id: string, @CurrentUser() user?: any) {
    return this.requestsService.findOne(id, user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an existing blood request" })
  @ApiParam({ name: "id", description: "Request UUID" })
  async update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requestsService.update(user.id, user.role, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete or cancel a blood request" })
  @ApiParam({ name: "id", description: "Request UUID" })
  async delete(@CurrentUser() user: any, @Param("id") id: string) {
    return this.requestsService.delete(user.id, user.role, id);
  }
}
