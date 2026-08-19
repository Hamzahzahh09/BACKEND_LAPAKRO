import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private reviewsService: ReviewsService,
    private transactionsService: TransactionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReviewDto,
  ) {
    const transaction = await this.transactionsService.findById(dto.transactionId);
    if (transaction.buyerId !== user.userId) {
      throw new ForbiddenException('Only buyer can review');
    }
    if (transaction.status !== 'completed') {
      throw new BadRequestException('Can only review completed transactions');
    }
    const review = await this.reviewsService.create(
      user.userId,
      transaction.sellerId,
      transaction.productId,
      dto,
    );
    await this.reviewsService.updateProductRating(transaction.productId);
    return { success: true, data: review, message: 'Review created' };
  }

  @Get('product/:productId')
  async getByProduct(@Param('productId') productId: string) {
    const reviews = await this.reviewsService.getByProduct(productId);
    const rating = await this.reviewsService.updateProductRating(productId);
    return { success: true, data: { reviews, rating } };
  }

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    const reviews = await this.reviewsService.getByUser(userId);
    const rating = await this.reviewsService.getAverageRating(userId);
    return { success: true, data: { reviews, rating } };
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  async reply(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    const review = await this.reviewsService.reply(id, user.userId, body.content);
    return { success: true, data: review, message: 'Reply added' };
  }
}
