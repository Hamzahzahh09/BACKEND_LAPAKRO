import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ProductsService } from '../products/products.service';

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
  async findAll(@CurrentUser() user: { userId: string }) {
    const transactions = await this.transactionsService.findByUser(user.userId);
    return { success: true, data: transactions };
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const transaction = await this.transactionsService.findById(id);
    if (transaction.buyerId !== user.userId && transaction.sellerId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }
    return { success: true, data: transaction };
  }

  @Patch(':id/confirm')
  async confirm(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const transaction = await this.transactionsService.findById(id);
    if (transaction.sellerId === user.userId) {
      const updated = await this.transactionsService.confirmBySeller(id, user.userId);
      return { success: true, data: updated, message: 'Confirmed by seller' };
    }
    if (transaction.buyerId === user.userId) {
      const updated = await this.transactionsService.confirmByBuyer(id, user.userId);
      return { success: true, data: updated, message: 'Confirmed by buyer' };
    }
    throw new ForbiddenException('Not authorized');
  }

  @Patch(':id/cancel')
  async cancel(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const transaction = await this.transactionsService.findById(id);
    if (transaction.buyerId !== user.userId && transaction.sellerId !== user.userId) {
      throw new ForbiddenException('Not authorized');
    }
    if (transaction.status === 'completed') {
      throw new BadRequestException('Cannot cancel completed transaction');
    }
    if (transaction.status === 'awaiting_buyer' && transaction.sellerId === user.userId) {
      throw new BadRequestException('Seller cannot cancel after delivery');
    }
    const updated = await this.transactionsService.cancel(id, user.userId);
    return { success: true, data: updated, message: 'Transaction cancelled' };
  }
}
