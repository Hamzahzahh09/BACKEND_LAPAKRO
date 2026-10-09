import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { RateLimitError } from '../exceptions/api.exception';

interface RateLimitStore {
  [userId: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store: RateLimitStore = {};
  private readonly requestsPerMinute = 60;
  private readonly requestsPerHour = 1000;
  private readonly cleanupInterval = 60000; // 1 minute

  constructor() {
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;

    if (!userId) {
      throw new RateLimitError('Cannot identify user for rate limiting');
    }

    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const hourWindow = Math.floor(now / 3600000);

    const key = `${userId}_${minuteWindow}_${hourWindow}`;

    if (!this.store[userId]) {
      this.store[userId] = {
        count: 0,
        resetTime: now + 60000, // Reset every minute
      };
    }

    const userData = this.store[userId];

    // Reset if time window has passed
    if (now > userData.resetTime) {
      userData.count = 0;
      userData.resetTime = now + 60000;
    }

    userData.count++;

    // Check limits
    if (userData.count > this.requestsPerMinute) {
      throw new RateLimitError(
        `Rate limit exceeded: ${userData.count}/${this.requestsPerMinute} requests per minute`,
        { userId, limit: this.requestsPerMinute, current: userData.count },
      );
    }

    // Add rate limit info to request
    request.rateLimit = {
      limit: this.requestsPerMinute,
      current: userData.count,
      remaining: this.requestsPerMinute - userData.count,
      resetTime: userData.resetTime,
    };

    return true;
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((userId) => {
      if (now > this.store[userId].resetTime + 120000) {
        delete this.store[userId];
      }
    });
  }
}
