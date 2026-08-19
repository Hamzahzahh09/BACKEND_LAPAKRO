import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryColumn()
  id: string;

  @Column()
  walletId: string;

  @Column({ type: 'varchar' })
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'release' | 'fee';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: 'pending' | 'completed' | 'failed';

  @Column()
  reference: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
