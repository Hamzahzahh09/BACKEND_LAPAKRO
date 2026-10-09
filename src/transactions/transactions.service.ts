import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(
    buyerId: string,
    sellerId: string,
    productPrice: number,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const now = new Date();
    const quantity = dto.quantity || 1;
    const transaction = this.transactionRepository.create({
      id: uuidv4(),
      buyerId,
      sellerId,
      productId: dto.productId,
      quantity,
      totalPrice: productPrice * quantity,
      notes: dto.notes || '',
      status: 'pending',
      escrowReleased: false,
      cancelledAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return this.transactionRepository.save(transaction);
  }

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['product', 'seller', 'buyer'],
    });
    if (!transaction) {
      throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    }
    return transaction;
  }

  async findByUser(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      relations: ['product', 'seller', 'buyer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByBuyer(buyerId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeller(sellerId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findAllWithRelations(): Promise<Transaction[]> {
    return this.transactionRepository.find({
      relations: ['product', 'seller', 'buyer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.transactionRepository.createQueryBuilder('t');
    if (status) {
      qb.where('t.status = :status', { status });
    }
    qb.orderBy('t.createdAt', 'DESC');
    const skip = (page - 1) * limit;
    const [data, total] = await qb.take(limit).skip(skip).getManyAndCount();
    return { data, total, page, limit };
  }

  async confirmBySeller(
    id: string,
    sellerId: string,
    deliveryNotes?: string,
  ): Promise<Transaction> {
    const transaction = await this.findById(id);
    if (transaction.sellerId !== sellerId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    // Seller boleh kirim saat masih pending (belum dibayar) maupun
    // awaiting_seller (sudah dibayar via Midtrans, tinggal kirim).
    if (
      transaction.status !== 'pending' &&
      transaction.status !== 'awaiting_seller'
    ) {
      throw new HttpException(
        'Invalid transaction status',
        HttpStatus.BAD_REQUEST,
      );
    }
    transaction.status = 'awaiting_buyer';
    transaction.updatedAt = new Date();
    if (deliveryNotes !== undefined) {
      transaction.deliveryNotes = deliveryNotes;
    }
    transaction.deliveredAt = new Date();
    return this.transactionRepository.save(transaction);
  }

  async confirmByBuyer(id: string, buyerId: string): Promise<Transaction> {
    const transaction = await this.findById(id);
    if (transaction.buyerId !== buyerId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    if (transaction.status !== 'awaiting_buyer') {
      throw new HttpException(
        'Invalid transaction status',
        HttpStatus.BAD_REQUEST,
      );
    }
    transaction.status = 'completed';
    transaction.escrowReleased = true;
    transaction.completedAt = new Date();
    transaction.updatedAt = new Date();
    return this.transactionRepository.save(transaction);
  }

  /**
   * Tandai transaksi SUDAH DIBAYAR (via Midtrans sync/webhook).
   * pending -> awaiting_seller. Status lain tidak diubah (idempotent).
   */
  async markPaid(id: string): Promise<Transaction> {
    const transaction = await this.findById(id);
    if (transaction.status === 'pending') {
      transaction.status = 'awaiting_seller';
      transaction.updatedAt = new Date();
      return this.transactionRepository.save(transaction);
    }
    return transaction;
  }

  async cancel(id: string, userId: string): Promise<Transaction> {    const transaction = await this.findById(id);
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    if (transaction.status === 'completed') {
      throw new HttpException(
        'Cannot cancel completed transaction',
        HttpStatus.BAD_REQUEST,
      );
    }
    transaction.status = 'cancelled';
    transaction.cancelledAt = new Date();
    transaction.updatedAt = new Date();
    return this.transactionRepository.save(transaction);
  }

  async markDisputed(id: string): Promise<Transaction> {
    const transaction = await this.findById(id);
    transaction.status = 'disputed';
    transaction.updatedAt = new Date();
    return this.transactionRepository.save(transaction);
  }

  async refund(id: string): Promise<Transaction> {
    const transaction = await this.findById(id);
    transaction.status = 'refunded';
    transaction.escrowReleased = false;
    transaction.updatedAt = new Date();
    return this.transactionRepository.save(transaction);
  }

  async autoCancelExpired(): Promise<string[]> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const expiredTransactions = await this.transactionRepository.find({
      where: {
        status: 'pending',
        createdAt: LessThanOrEqual(oneDayAgo),
      },
    });

    const cancelledIds: string[] = [];
    for (const t of expiredTransactions) {
      t.status = 'cancelled';
      t.cancelledAt = now;
      t.updatedAt = now;
      await this.transactionRepository.save(t);
      cancelledIds.push(t.id);
    }
    return cancelledIds;
  }

  async autoReleaseEscrow(): Promise<string[]> {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const releasableTransactions = await this.transactionRepository.find({
      where: {
        status: 'awaiting_buyer',
        escrowReleased: false,
        updatedAt: LessThanOrEqual(threeDaysAgo),
      },
    });

    const releasedIds: string[] = [];
    for (const t of releasableTransactions) {
      t.status = 'completed';
      t.escrowReleased = true;
      t.completedAt = now;
      t.updatedAt = now;
      await this.transactionRepository.save(t);
      releasedIds.push(t.id);
    }
    return releasedIds;
  }

  async forceComplete(id: string): Promise<Transaction> {
    const transaction = await this.findById(id);
    transaction.status = 'completed';
    transaction.escrowReleased = true;
    transaction.completedAt = new Date();
    transaction.updatedAt = new Date();
    return this.transactionRepository.save(transaction);
  }
}
