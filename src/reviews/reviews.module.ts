import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { SellerRatingController } from './controllers/seller-rating.controller';
import { SellerRatingService } from './services/seller-rating.service';
import { AuthModule } from '../auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { Review } from './entities/review.entity';
import { SellerRating } from './entities/seller-rating.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, SellerRating, Product]),
    AuthModule,
    TransactionsModule,
  ],
  controllers: [ReviewsController, SellerRatingController],
  providers: [ReviewsService, SellerRatingService],
  exports: [ReviewsService, SellerRatingService],
})
export class ReviewsModule {}
