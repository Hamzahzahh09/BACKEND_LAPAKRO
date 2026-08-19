import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { hasSufficientRole } from '../common/constants/roles';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    const data = await this.adminService.getDashboard();
    return { success: true, data };
  }

  @Get('users')
  async getUsers(@Query() query: { page?: string; limit?: string; search?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const users = await this.adminService.getUsers(page, limit, query.search);
    return { success: true, data: users, page, limit };
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.adminService.getUser(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { success: true, data: user };
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @CurrentUser() admin: { userId: string; role: string },
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    if (!['user', 'seller'].includes(body.role)) {
      throw new ForbiddenException('Can only assign user or seller role');
    }
    if (admin.userId === id) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const user = await this.adminService.updateRole(id, body.role);
    return { success: true, data: user, message: `Role updated to ${body.role}` };
  }

  @Patch('users/:id/ban')
  async toggleBan(@Param('id') id: string) {
    const user = await this.adminService.toggleBan(id);
    return { success: true, data: user, message: user.isBanned ? 'User banned' : 'User unbanned' };
  }

  @Delete('users/:id')
  async deleteUser(
    @CurrentUser() admin: { userId: string; role: string },
    @Param('id') id: string,
  ) {
    if (admin.userId === id) {
      throw new ForbiddenException('Cannot delete yourself');
    }
    const target = await this.adminService.getUser(id);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (hasSufficientRole(target.role, 'admin') && admin.role !== 'owner') {
      throw new ForbiddenException('Only owner can delete admin users');
    }
    await this.adminService.deleteUser(id);
    return { success: true, message: 'User deleted' };
  }

  @Get('products')
  async getAllProducts(@Query() query: { page?: string; limit?: string; status?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const products = await this.adminService.getAllProducts(page, limit, query.status);
    return { success: true, data: products };
  }

  @Patch('products/:id/approve')
  async approveProduct(@Param('id') id: string) {
    const product = await this.adminService.approveProduct(id);
    return { success: true, data: product, message: 'Product approved' };
  }

  @Patch('products/:id/reject')
  async rejectProduct(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const product = await this.adminService.rejectProduct(id, body.reason);
    return { success: true, data: product, message: 'Product rejected' };
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    await this.adminService.deleteProduct(id);
    return { success: true, message: 'Product deleted' };
  }

  @Get('pending-sellers')
  async getPendingSellers() {
    const sellers = await this.adminService.getPendingSellers();
    return { success: true, data: sellers };
  }

  @Patch('sellers/:id/approve')
  async approveSeller(@Param('id') id: string) {
    const user = await this.adminService.approveSeller(id);
    return { success: true, data: user, message: 'Seller approved' };
  }

  @Patch('sellers/:id/reject')
  async rejectSeller(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const user = await this.adminService.rejectSeller(id, body.reason);
    return { success: true, data: user, message: 'Seller rejected' };
  }

  @Get('transactions')
  async getAllTransactions(@Query() query: { page?: string; limit?: string; status?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const transactions = await this.adminService.getAllTransactions(page, limit, query.status);
    return { success: true, data: transactions };
  }

  @Get('disputes')
  async getAllDisputes() {
    const disputes = await this.adminService.getAllDisputes();
    return { success: true, data: disputes };
  }

  @Patch('disputes/:id/resolve')
  async resolveDispute(
    @Param('id') id: string,
    @Body() body: { resolution: string; note?: string; winnerId?: string },
  ) {
    const resolution = body.resolution as 'full_refund' | 'partial_refund' | 'proceed';
    const dispute = await this.adminService.resolveDispute(id, resolution, body.note || '', body.winnerId);
    return { success: true, data: dispute, message: 'Dispute resolved' };
  }

  @Patch('users/:id/upgrade')
  async upgradeToAdmin(
    @CurrentUser() admin: { userId: string; role: string },
    @Param('id') id: string,
  ) {
    if (admin.role !== 'owner') {
      throw new ForbiddenException('Only owner can upgrade to admin');
    }
    const user = await this.adminService.upgradeToAdmin(id);
    return { success: true, data: user, message: 'User upgraded to admin' };
  }
}
