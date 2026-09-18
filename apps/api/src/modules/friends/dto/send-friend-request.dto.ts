import { IsUUID, IsOptional, IsEmail } from "class-validator";

export class SendFriendRequestDto {
  @IsOptional()
  @IsUUID()
  addressee_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
