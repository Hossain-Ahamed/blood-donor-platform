import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PushSubscriptionKeysDto {
  @ApiProperty({ description: 'P256DH public key', example: 'BNcRdreALRFXTkOOUHK18mW...' })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({ description: 'Auth secret', example: 'tBHItDaQqW6V31EQ5r27Dg==' })
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class SubscribePushDto {
  @ApiProperty({ description: 'Push notification endpoint URL', example: 'https://fcm.googleapis.com/fcm/send/...' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ description: 'Cryptographic keys for payload encryption' })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
}

export class UnsubscribePushDto {
  @ApiPropertyOptional({ description: 'Specific endpoint URL to unsubscribe. If omitted, removes all endpoints for the user.' })
  @IsString()
  @IsOptional()
  endpoint?: string;
}

