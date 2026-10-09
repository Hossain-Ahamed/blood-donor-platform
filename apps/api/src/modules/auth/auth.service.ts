import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { UserRole } from '@repo/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createTokenPair(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      },
    );

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newRefreshToken = this.refreshTokenRepository.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked: false,
    });
    await this.refreshTokenRepository.save(newRefreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    };
  }

  async refreshTokens(refreshTokenString: string) {
    if (!refreshTokenString) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshTokenString, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshTokenString);
    const existingToken = await this.refreshTokenRepository.findOne({
      where: { token_hash: tokenHash },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (existingToken.revoked) {
      // Check if this was rotated recently (concurrent client requests within 30 seconds)
      const recentValidToken = await this.refreshTokenRepository.findOne({
        where: { user_id: existingToken.user_id, revoked: false },
        order: { created_at: 'DESC' },
      });

      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      if (recentValidToken && recentValidToken.created_at > thirtySecondsAgo) {
        const user = await this.userRepository.findOne({
          where: { id: existingToken.user_id },
        });
        if (user) {
          return this.createTokenPair(user);
        }
      }

      // True token reuse detection: Invalidate all tokens for this user
      await this.refreshTokenRepository.update(
        { user_id: existingToken.user_id },
        { revoked: true },
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > existingToken.expires_at) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke old token for rotation
    existingToken.revoked = true;
    await this.refreshTokenRepository.save(existingToken);

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.createTokenPair(user);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ user_id: userId }, { revoked: true });
  }

  async googleLogin(req) {
    if (!req.user) {
      throw new UnauthorizedException('No user from google');
    }
    const { google_id, email, name, avatar_url } = req.user;

    let user = await this.userRepository.findOne({
      where: [
        { google_id },
        { email },
      ],
    });

    if (!user) {
      user = this.userRepository.create({
        google_id,
        email,
        name,
        avatar_url,
        role: UserRole.USER,
      });
      await this.userRepository.save(user);
    } else {
      let updated = false;
      if (user.google_id !== google_id) {
        user.google_id = google_id;
        updated = true;
      }
      if (user.email !== email) {
        user.email = email;
        updated = true;
      }
      if (avatar_url && user.avatar_url !== avatar_url) {
        user.avatar_url = avatar_url;
        updated = true;
      }
      if (name && user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (updated) {
        await this.userRepository.save(user);
      }
    }

    return this.createTokenPair(user);
  }
}
