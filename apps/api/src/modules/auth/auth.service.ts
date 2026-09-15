import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

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

    let user = await this.userRepository.findOne({ where: { google_id } });
    
    if (!user) {
      user = this.userRepository.create({
        google_id,
        email,
        name,
        avatar_url,
      });
      await this.userRepository.save(user);
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

