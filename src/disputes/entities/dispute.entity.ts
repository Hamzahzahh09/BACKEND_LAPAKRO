import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('disputes')
export class Dispute {
  @PrimaryColumn()
  id: string;

  @Column()
  transactionId: string;

  @Column()
  buyerId: string;

  @Column()
  sellerId: string;

  @Column()
  reason: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  evidence: string[];

  @Column({ type: 'varchar', default: 'open' })
  status: 'open' | 'under_review' | 'resolved' | 'escalated';

  @Column({ type: 'varchar', nullable: true })
  resolution: 'full_refund' | 'partial_refund' | 'proceed' | null;

  @Column({ type: 'text', nullable: true, default: null })
  adminNote: string | null;

  @Column({ type: 'varchar', nullable: true })
  winnerId: string | null;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
