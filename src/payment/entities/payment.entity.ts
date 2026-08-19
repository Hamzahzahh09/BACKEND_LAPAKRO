import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'varchar', nullable: true })
  transactionId: string;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  method: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'completed' | 'failed' | 'expired';

  @Column()
  vaNumber: string;

  @Column()
  paymentUrl: string;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
