import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(
    buyerId: string,
    sellerId: string,
    productId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    const existing = await this.reviewRepository.findOne({
      where: { transactionId: dto.transactionId, buyerId },
    });
    if (existing) {
      throw new HttpException(
        'Already reviewed this transaction',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    const review = this.reviewRepository.create({
      id: uuidv4(),
      transactionId: dto.transactionId,
      productId,
      sellerId,
      buyerId,
      rating: dto.rating,
      content: dto.content,
      images: dto.images || [],
      reply: null,
      repliedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return this.reviewRepository.save(review);
  }

  async getByProduct(productId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { productId },
      order: { createdAt: 'DESC' },
    });
  }

  async getByUser(userId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: [
        { buyerId: userId },
        { sellerId: userId }
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getBySeller(sellerId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAverageRating(sellerId: string): Promise<{ average: number; count: number }> {
    const sellerReviews = await this.getBySeller(sellerId);
    if (sellerReviews.length === 0) {
      return { average: 0, count: 0 };
    }
    const sum = sellerReviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / sellerReviews.length) * 10) / 10,
      count: sellerReviews.length,
    };
  }

  async reply(reviewId: string, sellerId: string, reply: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new HttpException('Review not found', HttpStatus.NOT_FOUND);
    }
    if (review.sellerId !== sellerId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    if (review.reply) {
      throw new HttpException('Already replied', HttpStatus.BAD_REQUEST);
    }
    review.reply = reply;
    review.repliedAt = new Date();
    review.updatedAt = new Date();
    return this.reviewRepository.save(review);
  }

  async updateProductRating(productId: string): Promise<{ average: number; count: number }> {
    const productReviews = await this.reviewRepository.find({
      where: { productId },
    });
    if (productReviews.length === 0) {
      const product = await this.productRepository.findOne({ where: { id: productId } });
      if (product) {
        product.averageRating = 0;
        product.reviewCount = 0;
        product.updatedAt = new Date();
        await this.productRepository.save(product);
      }
      return { average: 0, count: 0 };
    }
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    const average = Math.round((sum / productReviews.length) * 10) / 10;

    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (product) {
      product.averageRating = average;
      product.reviewCount = productReviews.length;
      product.updatedAt = new Date();
      await this.productRepository.save(product);
    }

    return { average, count: productReviews.length };
  }

  async getByTransaction(transactionId: string): Promise<Review | null> {
    return this.reviewRepository.findOne({
      where: { transactionId },
    });
  }
}
