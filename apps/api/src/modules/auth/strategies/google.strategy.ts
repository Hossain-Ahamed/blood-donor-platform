import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos, displayName } = profile;
    const fullName = name
      ? `${name.givenName || ''} ${name.familyName || ''}`.trim()
      : (displayName || 'Google User');
    const user = {
      google_id: id,
      email: emails && emails.length > 0 ? emails[0].value : '',
      name: fullName || 'Google User',
      avatar_url: photos && photos.length > 0 ? photos[0].value : null,
    };
    done(null, user);
  }
}

