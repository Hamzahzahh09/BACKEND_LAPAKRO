import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SellerRatingService } from './seller-rating.service';
import { SellerRating } from '../entities/seller-rating.entity';
import { LoggerService } from '../../common/logger/logger.service';
import { NotFoundError, ValidationError } from '../../common/exceptions/api.exception';

describe('SellerRatingService', () => {
  let service: SellerRatingService;
  let mockRepository: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerRatingService,
        {
          provide: getRepositoryToken(SellerRating),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<SellerRatingService>(SellerRatingService);
  });

  describe('createRating', () => {
    it('should create a new seller rating', async () => {
      const dto = {
        sellerId: 'seller-123',
        rating: 5,
        comment: 'Great seller!',
      };

      const savedRating = {
        id: 'rating-123',
        ...dto,
        buyerId: 'buyer-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.save.mockResolvedValue(savedRating);

      const result = await service.createRating('buyer-123', dto);

      expect(result.id).toBe('rating-123');
      expect(result.rating).toBe(5);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should throw error if rating is invalid', async () => {
      const dto = {
        sellerId: 'seller-123',
        rating: 6, // Invalid
        comment: 'Great seller!',
      };

      try {
        await service.createRating('buyer-123', dto);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('getSellerStats', () => {
    it('should return seller statistics', async () => {
      const ratings = [
        { rating: 5, aspects: { productQuality: 5, communication: 5, shipping: 5, accuracy: 5 } },
        { rating: 4, aspects: { productQuality: 4, communication: 4, shipping: 4, accuracy: 4 } },
        { rating: 5, aspects: { productQuality: 5, communication: 5, shipping: 5, accuracy: 5 } },
      ];

      mockRepository.find.mockResolvedValue(ratings);

      const result = await service.getSellerStats('seller-123');

      expect(result.totalRatings).toBe(3);
      expect(result.averageRating).toBeCloseTo(4.7, 1);
      expect(result.ratingBreakdown.fiveStar).toBe(2);
      expect(result.ratingBreakdown.fourStar).toBe(1);
    });

    it('should return empty stats if no ratings', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getSellerStats('seller-123');

      expect(result.totalRatings).toBe(0);
      expect(result.averageRating).toBe(0);
    });
  });

  describe('updateRating', () => {
    it('should update a rating', async () => {
      const existingRating = {
        id: 'rating-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        rating: 3,
        comment: 'OK',
      };

      mockRepository.findOne.mockResolvedValue(existingRating);
      mockRepository.save.mockResolvedValue({
        ...existingRating,
        rating: 5,
        comment: 'Great!',
      });

      const result = await service.updateRating('rating-123', 'buyer-123', {
        rating: 5,
        comment: 'Great!',
      });

      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Great!');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error if rating not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      try {
        await service.updateRating('rating-123', 'buyer-123', { rating: 5 });
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    });
  });
});
