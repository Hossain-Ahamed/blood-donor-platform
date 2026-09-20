import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '../../entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { invalidateCacheKeys } from '../../common/utils/cache.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  async getMe(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateMe(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getMe(userId);
    Object.assign(user, updateUserDto);
    const updated = await this.userRepository.save(user);

    await invalidateCacheKeys(this.cacheManager, [`profile:user:${userId}`]);
    return updated;
  }

  async softDeleteMe(userId: string): Promise<{ success: boolean }> {
    const user = await this.getMe(userId);
    user.is_active = false;
    user.deleted_at = new Date();
    await this.userRepository.save(user);

    await invalidateCacheKeys(this.cacheManager, [`profile:user:${userId}`]);
    return { success: true };
  }
}
