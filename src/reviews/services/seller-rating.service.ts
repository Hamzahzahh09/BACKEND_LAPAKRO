import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SellerRating } from '../entities/seller-rating.entity';
import {
  CreateSellerRatingDto,
  SellerStatsDto,
} from '../dtos/seller-rating.dto';
import { LoggerService } from '../../common/logger/logger.service';
import {
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/api.exception';

@Injectable()
export class SellerRatingService {
  constructor(
    @InjectRepository(SellerRating)
    private readonly sellerRatingRepository: Repository<SellerRating>,
    private readonly logger: LoggerService,
  ) {}

  async createRating(
    buyerId: string,
    dto: CreateSellerRatingDto,
  ): Promise<SellerRating> {
    try {
      // Validate rating
      if (dto.rating < 1 || dto.rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      // Validate aspects if provided
      if (dto.aspects) {
        Object.values(dto.aspects).forEach((value) => {
          if (value < 1 || value > 5) {
            throw new ValidationError(
              'All aspect ratings must be between 1 and 5',
            );
          }
        });
      }

      const rating = new SellerRating();
      rating.id = uuidv4();
      rating.sellerId = dto.sellerId;
      rating.buyerId = buyerId;
      rating.rating = dto.rating;
      rating.comment = dto.comment;
      rating.aspects = dto.aspects;

      const saved = await this.sellerRatingRepository.save(rating);
      this.logger.log('Seller rating created', {
        ratingId: saved.id,
        sellerId: saved.sellerId,
        rating: saved.rating,
      });

      return saved;
    } catch (error) {
      this.logger.error('Failed to create seller rating', error);
      throw error;
    }
  }

  async getSellerStats(sellerId: string): Promise<SellerStatsDto> {
    try {
      const ratings = await this.sellerRatingRepository.find({
        where: { sellerId },
      });

      if (ratings.length === 0) {
        return {
          sellerId,
          averageRating: 0,
          totalRatings: 0,
          ratingBreakdown: {
            fiveStar: 0,
            fourStar: 0,
            threeStar: 0,
            twoStar: 0,
            oneStar: 0,
          },
        };
      }

      // Calculate average rating
      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating =
        Math.round((totalRating / ratings.length) * 10) / 10;

      // Calculate rating breakdown
      const ratingBreakdown = {
        fiveStar: ratings.filter((r) => r.rating === 5).length,
        fourStar: ratings.filter((r) => r.rating === 4).length,
        threeStar: ratings.filter((r) => r.rating === 3).length,
        twoStar: ratings.filter((r) => r.rating === 2).length,
        oneStar: ratings.filter((r) => r.rating === 1).length,
      };

      // Calculate aspects average if available
      let aspectsAverage: any = null;
      const ratingsWithAspects = ratings.filter((r) => r.aspects);
      if (ratingsWithAspects.length > 0) {
        aspectsAverage = {
          productQuality:
            Math.round(
              (ratingsWithAspects.reduce(
                (sum, r) => sum + (r.aspects?.productQuality ?? 0),
                0,
              ) /
                ratingsWithAspects.length) *
                10,
            ) / 10,
          communication:
            Math.round(
              (ratingsWithAspects.reduce(
                (sum, r) => sum + (r.aspects?.communication ?? 0),
                0,
              ) /
                ratingsWithAspects.length) *
                10,
            ) / 10,
          shipping:
            Math.round(
              (ratingsWithAspects.reduce(
                (sum, r) => sum + (r.aspects?.shipping ?? 0),
                0,
              ) /
                ratingsWithAspects.length) *
                10,
            ) / 10,
          accuracy:
            Math.round(
              (ratingsWithAspects.reduce(
                (sum, r) => sum + (r.aspects?.accuracy ?? 0),
                0,
              ) /
                ratingsWithAspects.length) *
                10,
            ) / 10,
        };
      }

      return {
        sellerId,
        averageRating,
        totalRatings: ratings.length,
        ratingBreakdown,
        aspectsAverage,
      };
    } catch (error) {
      this.logger.error('Failed to get seller stats', error);
      throw error;
    }
  }

  async getSellerRatings(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: SellerRating[]; total: number; page: number }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await this.sellerRatingRepository.findAndCount({
        where: { sellerId },
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
        relations: ['buyer'],
      });

      return { data, total, page };
    } catch (error) {
      this.logger.error('Failed to get seller ratings', error);
      throw error;
    }
  }

  async updateRating(
    ratingId: string,
    buyerId: string,
    dto: Partial<CreateSellerRatingDto>,
  ): Promise<SellerRating> {
    try {
      const rating = await this.sellerRatingRepository.findOne({
        where: { id: ratingId },
      });

      if (!rating) {
        throw new NotFoundError('Seller rating not found');
      }

      if (rating.buyerId !== buyerId) {
        throw new ValidationError('You can only update your own ratings');
      }

      if (dto.rating) {
        if (dto.rating < 1 || dto.rating > 5) {
          throw new ValidationError('Rating must be between 1 and 5');
        }
        rating.rating = dto.rating;
      }

      if (dto.comment !== undefined) {
        rating.comment = dto.comment;
      }

      if (dto.aspects) {
        Object.values(dto.aspects).forEach((value) => {
          if (value < 1 || value > 5) {
            throw new ValidationError(
              'All aspect ratings must be between 1 and 5',
            );
          }
        });
        rating.aspects = dto.aspects;
      }

      const updated = await this.sellerRatingRepository.save(rating);
      this.logger.log('Seller rating updated', { ratingId: updated.id });

      return updated;
    } catch (error) {
      this.logger.error('Failed to update seller rating', error);
      throw error;
    }
  }

  async deleteRating(ratingId: string, buyerId: string): Promise<void> {
    try {
      const rating = await this.sellerRatingRepository.findOne({
        where: { id: ratingId },
      });

      if (!rating) {
        throw new NotFoundError('Seller rating not found');
      }

      if (rating.buyerId !== buyerId) {
        throw new ValidationError('You can only delete your own ratings');
      }

      await this.sellerRatingRepository.remove(rating);
      this.logger.log('Seller rating deleted', { ratingId });
    } catch (error) {
      this.logger.error('Failed to delete seller rating', error);
      throw error;
    }
  }
}
