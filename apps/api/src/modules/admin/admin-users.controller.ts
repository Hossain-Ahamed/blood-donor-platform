import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { AdminQueryUsersDto, AdminUpdateUserDto } from './dto/admin-user.dto';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) { }

  @Get()
  @ApiOperation({ summary: '[Admin] Query all users with pagination and search' })
  async findAll(@Query() query: AdminQueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Get detailed user profile by UUID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Update user role or active status (block/unblock)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async update(
    @Param('id') id: string,
    @Body() updateData: AdminUpdateUserDto,
    @CurrentUser() admin: User
  ) {
    return this.usersService.update(admin.id, id, updateData);
  }
}

