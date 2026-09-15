import { IsEnum } from 'class-validator';
import { ResponseStatus } from '@repo/shared';

export class UpdateResponseDto {
  @IsEnum(ResponseStatus)
  status: ResponseStatus;
}

