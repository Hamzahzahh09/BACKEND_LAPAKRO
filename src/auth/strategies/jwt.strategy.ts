import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserJwtPayload } from '../../common/interfaces/user.interface';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'lapakro-secret-key',
    });
  }

  async validate(payload: UserJwtPayload) {
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.isBanned) {
      throw new UnauthorizedException('Your account has been banned');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: user.role,
      kycLevel: user.kycLevel,
      isBanned: user.isBanned,
      isVerified: user.isVerified,
      sellerApplicationStatus: user.sellerApplicationStatus,
    };
  }
}
