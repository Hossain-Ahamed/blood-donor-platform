import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserRole } from '@repo/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async googleLogin(req) {
    if (!req.user) {
      throw new UnauthorizedException('No user from google');
    }
    const { google_id, email, name, avatar_url } = req.user;

    let user = await this.userRepository.findOne({ 
      where: [
        { google_id },
        { email }
      ] 
    });
    
    if (!user) {
      user = this.userRepository.create({
        google_id,
        email,
        name,
        avatar_url,
        role: email === 'ahamed.hossain@rpsu.edu.bd' ? UserRole.ADMIN : UserRole.USER,
      });
      await this.userRepository.save(user);
    } else {
      // If found by email but google_id is different/empty (from seed), update it
      // Check and sync any changed fields
      let updated = false;
      if (user.google_id !== google_id) {
        user.google_id = google_id;
        updated = true;
      }
      if (user.email !== email) {
        user.email = email;
        updated = true;
      }
      if (user.avatar_url !== avatar_url) {
        user.avatar_url = avatar_url;
        updated = true;
      }
      if (user.email === 'ahamed.hossain@rpsu.edu.bd' && user.role !== UserRole.ADMIN) {
        user.role = UserRole.ADMIN;
        updated = true;
      }
      if (updated) {
        await this.userRepository.save(user);
      }
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      }
    };
  }
}
