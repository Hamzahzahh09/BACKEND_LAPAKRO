import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { Dispute } from './entities/dispute.entity';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
  ) {}

  async create(
    buyerId: string,
    sellerId: string,
    dto: CreateDisputeDto,
  ): Promise<Dispute> {
    const existing = await this.disputeRepository.findOne({
      where: { transactionId: dto.transactionId, status: Not('resolved') },
    });
    if (existing) {
      throw new HttpException(
        'Dispute already exists for this transaction',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    const dispute = this.disputeRepository.create({
      id: uuidv4(),
      transactionId: dto.transactionId,
      buyerId,
      sellerId,
      reason: dto.reason,
      description: dto.description,
      evidence: dto.evidence || [],
      status: 'open',
      resolution: null,
      adminNote: '',
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return this.disputeRepository.save(dispute);
  }

  async findById(id: string): Promise<Dispute> {
    const dispute = await this.disputeRepository.findOne({ where: { id } });
    if (!dispute) {
      throw new HttpException('Dispute not found', HttpStatus.NOT_FOUND);
    }
    return dispute;
  }

  async findAll(): Promise<Dispute[]> {
    return this.disputeRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: [
        { buyerId: userId },
        { sellerId: userId }
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getOpenDisputes(): Promise<Dispute[]> {
    return this.disputeRepository.find({
      where: [
        { status: 'open' },
        { status: 'under_review' }
      ],
    });
  }

  async resolve(
    id: string,
    resolution: 'full_refund' | 'partial_refund' | 'proceed',
    adminNote: string,
    winnerId?: string,
  ): Promise<Dispute> {
    const dispute = await this.findById(id);
    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.adminNote = adminNote;
    dispute.winnerId = winnerId || null;
    dispute.resolvedAt = new Date();
    dispute.updatedAt = new Date();
    return this.disputeRepository.save(dispute);
  }

  async escalate(id: string): Promise<Dispute> {
    const dispute = await this.findById(id);
    dispute.status = 'escalated';
    dispute.updatedAt = new Date();
    return this.disputeRepository.save(dispute);
  }

  async setUnderReview(id: string): Promise<Dispute> {
    const dispute = await this.findById(id);
    dispute.status = 'under_review';
    dispute.updatedAt = new Date();
    return this.disputeRepository.save(dispute);
  }
}

