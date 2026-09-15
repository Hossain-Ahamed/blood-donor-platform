import { IsEnum } from 'class-validator';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import * as sanitizeHtml from 'sanitize-html';
import { ResponseStatus } from '@repo/shared';

export class CreateResponseDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value ? sanitizeHtml(value) : value)
  message?: string;
}

export class UpdateResponseDto {
  @IsEnum(ResponseStatus)
  status: ResponseStatus;
}

