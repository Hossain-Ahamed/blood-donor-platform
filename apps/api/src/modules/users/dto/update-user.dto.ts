import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUrl()
  @IsOptional()
  avatar_url?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

