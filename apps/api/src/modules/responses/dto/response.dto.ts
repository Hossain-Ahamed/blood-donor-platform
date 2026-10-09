import { IsEnum, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import * as sanitizeHtml from "sanitize-html";
import { ResponseStatus } from "@repo/shared";

export class CreateResponseDto {
  @ApiPropertyOptional({ description: "Optional message to requester", example: "I am available to donate blood tomorrow." })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  message?: string;
}

export class UpdateResponseDto {
  @ApiProperty({ enum: ResponseStatus, description: "Updated response status", example: ResponseStatus.ACCEPTED })
  @IsEnum(ResponseStatus)
  status: ResponseStatus;

  @ApiPropertyOptional({ description: "Rejection reason if status is REJECTED", example: "Donor is unwell or unable to travel" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? sanitizeHtml(value) : value))
  rejection_reason?: string;
}
