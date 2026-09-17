import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // If the request has an authenticated user, throttle per user!
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    // Fallback to client IP for unauthenticated / public routes
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
