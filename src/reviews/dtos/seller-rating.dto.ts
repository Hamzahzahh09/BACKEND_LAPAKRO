import { IsNumber, IsString, IsOptional, Min, Max, IsObject } from 'class-validator';

export class CreateSellerRatingDto {
  @IsString()
  sellerId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsObject()
  @IsOptional()
  aspects?: {
    productQuality: number;
    communication: number;
    shipping: number;
    accuracy: number;
  };
}

export class SellerRatingResponseDto {
  id: string;
  sellerId: string;
  buyerId: string;
  rating: number;
  comment?: string;
  aspects?: {
    productQuality: number;
    communication: number;
    shipping: number;
    accuracy: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class SellerStatsDto {
  sellerId: string;
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
  aspectsAverage?: {
    productQuality: number;
    communication: number;
    shipping: number;
    accuracy: number;
  };
}
