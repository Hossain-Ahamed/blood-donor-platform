import { Controller, Get, Patch, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and account details' })
  @ApiResponse({ status: 200, description: 'Profile details returned successfully' })
  async getMe(@CurrentUser() user: any) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user basic profile info' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateMe(@CurrentUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, updateUserDto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Soft delete current user account' })
  @ApiResponse({ status: 200, description: 'Account deactivated' })
  async softDeleteMe(@CurrentUser() user: any) {
    return this.usersService.softDeleteMe(user.id);
  }
}
