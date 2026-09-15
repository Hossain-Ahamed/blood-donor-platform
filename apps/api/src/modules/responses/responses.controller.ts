import { Controller, Post, Patch, Param, Body } from '@nestjs/common';
import { ResponsesService } from './responses.service';
import { UpdateResponseDto } from './dto/response.dto';
import { CreateResponseDto, UpdateResponseDto } from './dto/response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) { }

  @Post('requests/:requestId/responses')
  async create(
    @Param('requestId') requestId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateResponseDto,
  ) {
    return this.responsesService.create(requestId, user.id);
    return this.responsesService.create(requestId, user.id, dto.message);
  }

  @Patch('responses/:id')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateResponseDto,
  ) {
    return this.responsesService.updateStatus(id, user.id, dto.status);
  }
}
