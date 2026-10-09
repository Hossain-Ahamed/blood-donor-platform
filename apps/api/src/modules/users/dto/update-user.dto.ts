import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "Full name of the user", example: "John Doe" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Avatar image URL", example: "https://example.com/avatar.jpg" })
  @IsUrl()
  @IsOptional()
  avatar_url?: string;

  @ApiPropertyOptional({ description: "Contact phone number", example: "+8801700000000" })
  @IsString()
  @IsOptional()
  phone?: string;
}

