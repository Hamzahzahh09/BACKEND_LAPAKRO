import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateModeDto } from './dto/update-mode.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: { userId: string }) {
    const profile = await this.usersService.getProfile(user.userId);
    const { password, otp, ...sanitized } = profile;
    return { success: true, data: sanitized };
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.usersService.updateProfile(user.userId, dto);
    const { password, otp, ...sanitized } = profile;
    return { success: true, data: sanitized, message: 'Profile updated' };
  }

  @Patch('mode')
  async updateMode(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateModeDto,
  ) {
    const profile = await this.usersService.updateMode(user.userId, dto.mode);
    const { password, otp, ...sanitized } = profile;
    return { success: true, data: sanitized, message: 'Mode updated' };
  }

  @Post('apply-seller')
  async applyAsSeller(
    @CurrentUser() user: { userId: string },
    @Body() body: { notes: string },
  ) {
    const profile = await this.usersService.applyAsSeller(user.userId, body.notes || '');
    const { password, otp, ...sanitized } = profile;
    return { success: true, data: sanitized, message: 'Seller application submitted' };
  }

  @Get('seller-status')
  async getSellerStatus(@CurrentUser() user: { userId: string }) {
    const status = await this.usersService.getSellerApplicationStatus(user.userId);
    return { success: true, data: status };
  }
}
