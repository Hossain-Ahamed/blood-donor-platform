import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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
    return this.userRepository.save(user);
  }

  async softDeleteMe(userId: string): Promise<{ success: boolean }> {
    const user = await this.getMe(userId);
    user.is_active = false;
    user.deleted_at = new Date();
    await this.userRepository.save(user);
    return { success: true };
  }
}
