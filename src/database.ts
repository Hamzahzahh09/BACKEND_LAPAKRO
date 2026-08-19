import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { Wallet } from './wallet/entities/wallet.entity';
import { WalletTransaction } from './wallet/entities/wallet-transaction.entity';
import { Payment } from './payment/entities/payment.entity';
import { Review } from './reviews/entities/review.entity';
import { Dispute } from './disputes/entities/dispute.entity';
import { ChatMessage } from './chat/entities/chat-message.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'roblox_store',
  entities: [
    User,
    Product,
    Transaction,
    Wallet,
    WalletTransaction,
    Payment,
    Review,
    Dispute,
    ChatMessage,
  ],
  migrations: ['src/migrations/*.ts'],
  migrationsRun: false,
  synchronize: false, // Disable synchronize in production, use migrations instead
  logging: process.env.NODE_ENV === 'development',
});
