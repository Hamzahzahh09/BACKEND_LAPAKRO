import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { hasSufficientRole } from '../constants/roles';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied');
    }
    if (!hasSufficientRole(user.role, 'admin')) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
