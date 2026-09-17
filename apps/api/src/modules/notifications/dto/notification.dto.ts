import { IsString, IsOptional, IsEnum, IsUUID } from "class-validator";
import { NotificationType } from "../../../entities/notification.entity";

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType = NotificationType.GENERAL;

  @IsString()
  @IsOptional()
  link?: string;
}
