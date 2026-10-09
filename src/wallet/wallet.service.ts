import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
  ) {}

  async createWallet(userId: string): Promise<Wallet> {
    const now = new Date();
    const wallet = this.walletRepository.create({
      id: uuidv4(),
      userId,
      balance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      createdAt: now,
      updatedAt: now,
    });
    return this.walletRepository.save(wallet);
  }

  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    }
    return wallet;
  }

  async getOrCreateWallet(userId: string): Promise<Wallet> {
    try {
      return await this.getWallet(userId);
    } catch {
      return await this.createWallet(userId);
    }
  }

  async deposit(
    userId: string,
    amount: number,
    paymentMethod?: string,
  ): Promise<WalletTransaction> {
    if (amount < 5000) {
      throw new HttpException(
        'Minimum deposit is Rp 5.000',
        HttpStatus.BAD_REQUEST,
      );
    }

    const wallet = await this.getOrCreateWallet(userId);
    const now = new Date();

    wallet.balance = Number(wallet.balance || 0) + Number(amount);
    wallet.totalDeposited = Number(wallet.totalDeposited || 0) + Number(amount);
    wallet.updatedAt = now;

    await this.walletRepository.save(wallet);

    const tx = this.walletTransactionRepository.create({
      id: uuidv4(),
      walletId: wallet.id,
      type: 'deposit',
      amount,
      fee: 0,
      status: 'completed',
      reference: `DEP-${uuidv4().substring(0, 8).toUpperCase()}`,
      description: `Deposit via ${paymentMethod || 'manual'}`,
      createdAt: now,
    });

    return this.walletTransactionRepository.save(tx);
  }

  async withdraw(
    userId: string,
    amount: number,
    bankName: string,
    bankAccount: string,
    accountHolder: string,
  ): Promise<WalletTransaction> {
    if (amount < 20000) {
      throw new HttpException(
        'Minimum withdrawal is Rp 20.000',
        HttpStatus.BAD_REQUEST,
      );
    }

    const wallet = await this.getOrCreateWallet(userId);

    const fee = bankName.toLowerCase().includes('bank') ? 0 : 2500;
    const totalDeduction = amount + fee;

    if (Number(wallet.balance || 0) < totalDeduction) {
      throw new HttpException('Insufficient balance', HttpStatus.BAD_REQUEST);
    }

    const now = new Date();
    wallet.balance = Number(wallet.balance || 0) - Number(totalDeduction);
    wallet.totalWithdrawn = Number(wallet.totalWithdrawn || 0) + Number(amount);
    wallet.updatedAt = now;

    await this.walletRepository.save(wallet);

    const tx = this.walletTransactionRepository.create({
      id: uuidv4(),
      walletId: wallet.id,
      type: 'withdrawal',
      amount,
      fee,
      status: 'completed',
      reference: `WD-${uuidv4().substring(0, 8).toUpperCase()}`,
      description: `Withdraw to ${bankName} - ${accountHolder} (${bankAccount})`,
      createdAt: now,
    });

    return this.walletTransactionRepository.save(tx);
  }

  async getHistory(userId: string): Promise<WalletTransaction[]> {
    const wallet = await this.getOrCreateWallet(userId);
    return this.walletTransactionRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });
  }

  async getBalance(userId: string): Promise<{ balance: number }> {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: Number(wallet.balance || 0) };
  }
}
