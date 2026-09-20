import { IsUUID, IsOptional, IsEmail, IsString } from "class-validator";

export class SendFriendRequestDto {
  @IsOptional()
  @IsUUID()
  addressee_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
