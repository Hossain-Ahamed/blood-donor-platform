import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private auditLogsService: AuditLogsService,
  ) { }

  async findAll(query: any) {
    const { page = 1, limit = 10, search, is_active, role } = query;
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user')
      .skip(skip)
      .take(limit)
      .orderBy('user.created_at', 'DESC');

    if (search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)', { search: `%${search}%` });
    }
    if (is_active !== undefined) {
      qb.andWhere('user.is_active = :is_active', { is_active: is_active === 'true' });
    }
    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) throw new NotFoundException('User not found');

    const donorProfile = await this.userRepository.manager.findOne('DonorProfile', { where: { user_id: id } });
    const requestsCount = await this.userRepository.manager.count('Request', { where: { requester_id: id } });
    const responsesCount = await this.userRepository.manager.count('Response', { where: { donor_id: id } });

    return {
      ...user,
      donor_profile: donorProfile,
      requests_count: requestsCount,
      responses_count: responsesCount,
    };
  }

  async update(adminId: string, id: string, updateData: { is_active?: boolean; role?: string }) {
    if (adminId === id && updateData.is_active === false) {
      throw new BadRequestException("You cannot block or deactivate your own account.");
    }
    if (adminId === id && updateData.role && updateData.role !== 'ADMIN') {
      throw new BadRequestException("You cannot revoke your own administrator role.");
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const before = { is_active: user.is_active, role: user.role };

    if (updateData.is_active !== undefined) {
      user.is_active = updateData.is_active;
    }
    if (updateData.role) {
      user.role = updateData.role as any;
    }

    const after = { is_active: user.is_active, role: user.role };

    await this.userRepository.save(user);

    let action = 'UPDATE_USER';
    if (before.is_active !== after.is_active) {
      action = after.is_active ? 'UNBLOCK_USER' : 'BLOCK_USER';
    } else if (before.role !== after.role) {
      action = 'CHANGE_ROLE';
    }

    await this.auditLogsService.record(adminId, action, 'USER', id, { before, after });

    return user;
  }
}

