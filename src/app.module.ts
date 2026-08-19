import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';
import { ChatModule } from './chat/chat.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DisputesModule } from './disputes/disputes.module';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './common/email/email.module';

// Entitas
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { Wallet } from './wallet/entities/wallet.entity';
import { WalletTransaction } from './wallet/entities/wallet-transaction.entity';
import { Payment } from './payment/entities/payment.entity';
import { Review } from './reviews/entities/review.entity';
import { SellerRating } from './reviews/entities/seller-rating.entity';
import { Dispute } from './disputes/entities/dispute.entity';
import { ChatMessage } from './chat/entities/chat-message.entity';

// Common modules
import { LoggerService } from './common/logger/logger.service';
import { HttpLoggingMiddleware } from './common/middleware/http-logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'roblox_store'),
        entities: [
          User,
          Product,
          Transaction,
          Wallet,
          WalletTransaction,
          Payment,
          Review,
          SellerRating,
          Dispute,
          ChatMessage,
        ],
        synchronize: configService.get<string>('NODE_ENV', 'development') === 'development',
        logging: configService.get<string>('NODE_ENV', 'development') === 'development',
        migrationsRun: configService.get<string>('NODE_ENV', 'development') !== 'development',
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
        ignoreUserAgents: [/bot|crawler/i],
      },
    ]),
    AuthModule,
    UsersModule,
    ProductsModule,
    TransactionsModule,
    WalletModule,
    PaymentModule,
    ChatModule,
    ReviewsModule,
    DisputesModule,
    AdminModule,
    EmailModule,
  ],
  providers: [LoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggingMiddleware).forRoutes('*');
  }
}

