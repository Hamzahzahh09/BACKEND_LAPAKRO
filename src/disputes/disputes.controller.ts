import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('disputes')
export class DisputesController {
  constructor(
    private disputesService: DisputesService,
    private transactionsService: TransactionsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateDisputeDto,
  ) {
    const transaction = await this.transactionsService.findById(
      dto.transactionId,
    );
    if (transaction.buyerId !== user.userId) {
      throw new ForbiddenException('Only buyer can open dispute');
    }

    const now = new Date();
    if (transaction.completedAt) {
      const daysSinceDelivery =
        (now.getTime() - new Date(transaction.completedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > 3) {
        throw new ForbiddenException(
          'Dispute must be opened within 3 days of delivery',
        );
      }
    }

    const dispute = await this.disputesService.create(
      user.userId,
      transaction.sellerId,
      dto,
    );
    await this.transactionsService.markDisputed(dto.transactionId);
    return { success: true, data: dispute, message: 'Dispute created' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: { userId: string }) {
    const disputes = await this.disputesService.findByUser(user.userId);
    return { success: true, data: disputes };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const dispute = await this.disputesService.findById(id);
    if (dispute.buyerId !== user.userId && dispute.sellerId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }
    return { success: true, data: dispute };
  }
}
