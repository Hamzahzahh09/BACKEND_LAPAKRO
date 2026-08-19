import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { TransactionsService } from '../transactions/transactions.service';
import { DisputesService } from '../disputes/disputes.service';

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private productsService: ProductsService,
    private transactionsService: TransactionsService,
    private disputesService: DisputesService,
  ) {}

  async getDashboard() {
    const allUsers = await this.usersService.findAll();
    const allTransactions = await this.transactionsService.findAll();
    const allDisputes = await this.disputesService.findAll();

    const totalUsers = allUsers.length;
    const totalSellers = allUsers.filter(
      (u) => u.role === 'seller' || u.role === 'admin' || u.role === 'owner',
    ).length;
    const totalTransactions = allTransactions.length;
    const completedTransactions = allTransactions.filter(
      (t) => t.status === 'completed',
    );
    const gmv = completedTransactions.reduce((sum, t) => sum + Number(t.totalPrice || 0), 0);
    const disputedCount = allTransactions.filter(
      (t) => t.status === 'disputed',
    ).length;
    const disputeRate = totalTransactions > 0 ? (disputedCount / totalTransactions) * 100 : 0;
    const pendingProducts = (await this.productsService.getPendingListings()).length;
    const openDisputes = (await this.disputesService.getOpenDisputes()).length;
    const pendingSellerApps = (await this.usersService.getPendingSellerApplications()).length;

    return {
      stats: {
        totalUsers,
        totalSellers,
        totalTransactions,
        gmv,
        disputeRate: Math.round(disputeRate * 100) / 100,
        pendingProducts,
        openDisputes,
        pendingSellerApps,
      },
    };
  }

  async deleteProduct(id: string) {
    return this.productsService.remove(id);
  }

  async getPendingListings() {
    return this.productsService.getPendingListings();
  }

  async reviewListing(id: string, status: 'active' | 'rejected') {
    return this.productsService.reviewListing(id, status);
  }

  async getDisputes() {
    return this.disputesService.findAll();
  }

  async resolveDispute(
    id: string,
    resolution: 'full_refund' | 'partial_refund' | 'proceed',
    adminNote: string,
    winnerId?: string,
  ) {
    return this.disputesService.resolve(id, resolution, adminNote, winnerId);
  }

  async getUsers(page?: number, limit?: number, search?: string) {
    return this.usersService.findAll(page, limit, search);
  }

  async getUser(id: string) {
    return this.usersService.findById(id);
  }

  async verifyUser(userId: string, level: number) {
    return this.usersService.setKycLevel(userId, level);
  }

  async banUser(userId: string, banned: boolean) {
    return this.usersService.setBanStatus(userId, banned);
  }

  async setUserRole(userId: string, role: string) {
    return this.usersService.setUserRole(userId, role);
  }

  async getPendingSellerApplications() {
    return this.usersService.getPendingSellerApplications();
  }

  async updateRole(id: string, role: string) {
    return this.usersService.setUserRole(id, role);
  }

  async toggleBan(id: string) {
    const user = await this.usersService.getProfile(id);
    return this.usersService.setBanStatus(id, !user.isBanned);
  }

  async deleteUser(id: string) {
    return this.usersService.deleteUser(id);
  }

  async getAllProducts(page: number, limit: number, status?: string) {
    return this.productsService.getAllProducts(page, limit, status);
  }

  async approveProduct(id: string) {
    return this.productsService.reviewListing(id, 'active');
  }

  async rejectProduct(id: string, reason?: string) {
    return this.productsService.reviewListing(id, 'rejected', reason);
  }

  async getPendingSellers() {
    return this.usersService.getPendingSellerApplications();
  }

  async approveSeller(id: string) {
    return this.usersService.approveSeller(id, true, '');
  }

  async rejectSeller(id: string, reason?: string) {
    return this.usersService.approveSeller(id, false, reason || '');
  }

  async getAllTransactions(page: number, limit: number, status?: string) {
    return this.transactionsService.findAllPaginated(page, limit, status);
  }

  async getAllDisputes() {
    return this.disputesService.findAll();
  }

  async upgradeToAdmin(id: string) {
    return this.usersService.upgradeToAdmin(id);
  }
}
