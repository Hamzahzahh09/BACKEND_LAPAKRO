import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto';
import { ProductsService } from '../products/products.service';
import { hasSufficientRole } from '../common/constants/roles';
import { Transaction } from './entities/transaction.entity';

function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, otp, ...rest } = user;
  return rest;
}

function formatTransaction(t: Transaction) {
  return {
    id: t.id,
    buyerId: t.buyerId,
    sellerId: t.sellerId,
    productId: t.productId,
    quantity: t.quantity,
    totalPrice: t.totalPrice,
    notes: t.notes,
    status: t.status,
    escrowReleased: t.escrowReleased,
    deliveryNotes: t.deliveryNotes ?? null,
    deliveredAt: t.deliveredAt ?? null,
    cancelledAt: t.cancelledAt,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    product: t.product
      ? {
          id: t.product.id,
          name: t.product.title,
          title: t.product.title,
          category: t.product.category,
          images: t.product.images,
        }
      : { id: t.productId, name: 'Produk Dihapus', title: 'Produk Dihapus', category: '-' },
    seller: t.seller
      ? { id: t.seller.id, name: t.seller.name }
      : { id: t.sellerId, name: 'Unknown' },
    buyer: t.buyer
      ? { id: t.buyer.id, name: t.buyer.name }
      : { id: t.buyerId, name: 'Unknown' },
  };
}

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private transactionsService: TransactionsService,
    private productsService: ProductsService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateTransactionDto,
  ) {
    const product = await this.productsService.findById(dto.productId);
    if (!product || product.isDeleted) {
      throw new NotFoundException('Product not found');
    }
    if (product.status !== 'active') {
      throw new BadRequestException('Product is not available');
    }
    if (product.sellerId === user.userId) {
      throw new BadRequestException('Cannot buy your own product');
    }
    if (product.stock !== undefined && product.stock < 1) {
      throw new BadRequestException('Product is out of stock');
    }
    const transaction = await this.transactionsService.create(
      user.userId,
      product.sellerId,
      product.price,
      dto,
    );
    await this.productsService.incrementSold(dto.productId);
    return {
      success: true,
      data: transaction,
      message: 'Transaction created',
    };
  }

  @Get()
  async findAll(
    @CurrentUser() user: { userId: string; role: string },
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const isAdmin = hasSufficientRole(user.role, 'admin');
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '10', 10) || 10));

    let transactions: Transaction[];

    if (isAdmin) {
      // Admin can see ALL transactions
      transactions = await this.transactionsService.findAllWithRelations();
    } else {
      transactions = await this.transactionsService.findByUser(user.userId);
    }

    // Filter by status
    if (status && status !== 'all') {
      transactions = transactions.filter((t) => t.status === status);
    }

    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.id.toLowerCase().includes(s) ||
          t.product?.title?.toLowerCase().includes(s) ||
          t.seller?.name?.toLowerCase().includes(s) ||
          t.buyer?.name?.toLowerCase().includes(s),
      );
    }

    const total = transactions.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginatedData = transactions.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedData.map(formatTransaction),
      total,
      page,
      totalPages,
    };
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: { userId: string; role: string },
    @Param('id') id: string,
  ) {
    const transaction = await this.transactionsService.findById(id);
    const isAdmin = hasSufficientRole(user.role, 'admin');
    if (
      !isAdmin &&
      transaction.buyerId !== user.userId &&
      transaction.sellerId !== user.userId
    ) {
      throw new ForbiddenException('Access denied');
    }
    return { success: true, data: formatTransaction(transaction) };
  }

  @Patch(':id/confirm')
  async confirm(
    @CurrentUser() user: { userId: string; role: string },
    @Param('id') id: string,
    @Body() dto?: ConfirmDeliveryDto,
  ) {
    const transaction = await this.transactionsService.findById(id);
    const isAdmin = hasSufficientRole(user.role, 'admin');

    // Admin can force-confirm any transaction
    if (isAdmin) {
      if (transaction.status === 'pending') {
        const updated = await this.transactionsService.confirmBySeller(
          id,
          transaction.sellerId,
          dto?.deliveryNotes,
        );
        return {
          success: true,
          data: formatTransaction(updated),
          message: 'Confirmed by admin (seller step)',
        };
      }
      if (transaction.status === 'awaiting_buyer') {
        const updated = await this.transactionsService.confirmByBuyer(
          id,
          transaction.buyerId,
        );
        return {
          success: true,
          data: formatTransaction(updated),
          message: 'Confirmed by admin (buyer step)',
        };
      }
      throw new BadRequestException(
        `Cannot confirm transaction with status: ${transaction.status}`,
      );
    }

    if (transaction.sellerId === user.userId) {
      const updated = await this.transactionsService.confirmBySeller(
        id,
        user.userId,
        dto?.deliveryNotes,
      );
      return {
        success: true,
        data: formatTransaction(updated),
        message: 'Confirmed by seller',
      };
    }
    if (transaction.buyerId === user.userId) {
      const updated = await this.transactionsService.confirmByBuyer(
        id,
        user.userId,
      );
      return {
        success: true,
        data: formatTransaction(updated),
        message: 'Confirmed by buyer',
      };
    }
    throw new ForbiddenException('Not authorized');
  }

  @Patch(':id/cancel')
  async cancel(
    @CurrentUser() user: { userId: string; role: string },
    @Param('id') id: string,
  ) {
    const transaction = await this.transactionsService.findById(id);
    const isAdmin = hasSufficientRole(user.role, 'admin');

    if (
      !isAdmin &&
      transaction.buyerId !== user.userId &&
      transaction.sellerId !== user.userId
    ) {
      throw new ForbiddenException('Not authorized');
    }
    if (transaction.status === 'completed') {
      throw new BadRequestException('Cannot cancel completed transaction');
    }
    if (
      !isAdmin &&
      transaction.status === 'awaiting_buyer' &&
      transaction.sellerId === user.userId
    ) {
      throw new BadRequestException('Seller cannot cancel after delivery');
    }

    const cancelUserId = isAdmin ? transaction.buyerId : user.userId;
    const updated = await this.transactionsService.cancel(id, cancelUserId);
    return {
      success: true,
      data: formatTransaction(updated),
      message: 'Transaction cancelled',
    };
  }

  @Patch(':id/complete')
  async forceComplete(
    @CurrentUser() user: { userId: string; role: string },
    @Param('id') id: string,
  ) {
    const isAdmin = hasSufficientRole(user.role, 'admin');
    if (!isAdmin) {
      throw new ForbiddenException('Only admin can force-complete transactions');
    }
    const transaction = await this.transactionsService.findById(id);
    if (transaction.status === 'completed') {
      throw new BadRequestException('Transaction is already completed');
    }
    if (transaction.status === 'cancelled') {
      throw new BadRequestException('Cannot complete a cancelled transaction');
    }
    const updated = await this.transactionsService.forceComplete(id);
    return {
      success: true,
      data: formatTransaction(updated),
      message: 'Transaction force-completed by admin',
    };
  }
}

