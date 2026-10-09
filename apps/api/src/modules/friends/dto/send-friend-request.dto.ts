import { IsUUID, IsOptional, IsEmail, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class SendFriendRequestDto {
  @ApiPropertyOptional({ description: "Target user UUID to send friend request to", example: "123e4567-e89b-12d3-a456-426614174000" })
  @IsOptional()
  @IsUUID()
  addressee_id?: string;

  @ApiPropertyOptional({ description: "Target user email", example: "friend@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Target user phone number", example: "+8801700000000" })
  @IsOptional()
  @IsString()
  phone?: string;
}
