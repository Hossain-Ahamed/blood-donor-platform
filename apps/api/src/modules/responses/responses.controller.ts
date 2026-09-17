import { Controller, Post, Patch, Get, Param, Body } from "@nestjs/common";
import { ResponsesService } from "./responses.service";
import { CreateResponseDto, UpdateResponseDto } from "./dto/response.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@Controller()
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post("requests/:requestId/responses")
  async create(
    @Param("requestId") requestId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResponseDto,
  ) {
    return this.responsesService.create(requestId, user.id, dto.message);
  }

  @Public()
  @Get("requests/:requestId/responses")
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
  async getMyResponses(@CurrentUser() user: any) {
    return this.responsesService.findMyAllResponses(user.id);
  }

  @Get("requests/:requestId/my-response")
  async findMyResponse(
    @Param("requestId") requestId: string,
    @CurrentUser() user: any,
  ) {
    return this.responsesService.findMyResponse(requestId, user.id);
  }

  @Patch("responses/:id")
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
