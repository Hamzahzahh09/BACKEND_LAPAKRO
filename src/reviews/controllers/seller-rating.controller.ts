import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SellerRatingService } from '../services/seller-rating.service';
import { CreateSellerRatingDto, SellerStatsDto } from '../dtos/seller-rating.dto';

@Controller('seller-ratings')
export class SellerRatingController {
  constructor(private readonly sellerRatingService: SellerRatingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createRating(
    @Request() req: any,
    @Body() dto: CreateSellerRatingDto,
  ) {
    return this.sellerRatingService.createRating(req.user.id, dto);
  }

  @Get('seller/:sellerId/stats')
  async getSellerStats(
    @Param('sellerId') sellerId: string,
  ): Promise<SellerStatsDto> {
    return this.sellerRatingService.getSellerStats(sellerId);
  }

  @Get('seller/:sellerId')
  async getSellerRatings(
    @Param('sellerId') sellerId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.sellerRatingService.getSellerRatings(sellerId, page, limit);
  }

  @Put(':ratingId')
  @UseGuards(JwtAuthGuard)
  async updateRating(
    @Request() req: any,
    @Param('ratingId') ratingId: string,
    @Body() dto: Partial<CreateSellerRatingDto>,
  ) {
    return this.sellerRatingService.updateRating(ratingId, req.user.id, dto);
  }

  @Delete(':ratingId')
  @UseGuards(JwtAuthGuard)
  async deleteRating(
    @Request() req: any,
    @Param('ratingId') ratingId: string,
  ) {
    await this.sellerRatingService.deleteRating(ratingId, req.user.id);
    return { message: 'Seller rating deleted successfully' };
  }
}
