import { Controller, Post, Patch, Get, Param, Body } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { ResponsesService } from "./responses.service";
import { CreateResponseDto, UpdateResponseDto } from "./dto/response.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Responses")
@ApiBearerAuth()
@Controller()
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post("requests/:requestId/responses")
  @ApiOperation({ summary: "Apply/respond to a blood request as a potential donor" })
  @ApiParam({ name: "requestId", description: "Blood Request UUID" })
  async create(
    @Param("requestId") requestId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResponseDto,
  ) {
    return this.responsesService.create(requestId, user.id, dto.message);
  }

  @Public()
  @Get("requests/:requestId/responses")
  @ApiOperation({ summary: "Get all donor applications for a blood request" })
  @ApiParam({ name: "requestId", description: "Blood Request UUID" })
  async findByRequestId(
    @Param("requestId") requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.responsesService.findByRequestId(
      requestId,
      user?.id,
      user?.role === "ADMIN",
    );
  }

  @Get("responses/me")
  @ApiOperation({ summary: "Get all donor applications submitted by the current user" })
  async getMyResponses(@CurrentUser() user: any) {
    return this.responsesService.findMyAllResponses(user.id);
  }

  @Get("requests/:requestId/my-response")
  @ApiOperation({ summary: "Get current user's application status for a specific request" })
  @ApiParam({ name: "requestId", description: "Blood Request UUID" })
  async findMyResponse(
    @Param("requestId") requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.responsesService.findMyResponse(requestId, user.id);
  }

  @Patch("responses/:id")
  @ApiOperation({ summary: "Accept, reject, or update status of a donor response" })
  @ApiParam({ name: "id", description: "Response UUID" })
  async updateStatus(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateResponseDto,
  ) {
    return this.responsesService.updateStatus(
      id,
      user.id,
      dto.status,
      user.role === "ADMIN",
      dto.rejection_reason,
    );
  }
}
