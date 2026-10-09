import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password?: string;

  @Column()
  name: string;

  @Column({ default: '' })
  phone: string;

  @Column({ default: '' })
  bio: string;

  @Column({ default: '' })
  photo: string;

  @Column({ type: 'varchar', default: 'buyer' })
  mode: 'buyer' | 'seller' | 'both';

  @Column({ default: 'user' })
  role: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: '' })
  referralCode: string;

  @Column({ default: 0 })
  kycLevel: number;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'varchar', default: 'none' })
  sellerApplicationStatus: 'none' | 'pending' | 'approved' | 'rejected';

  @Column({ type: 'text', nullable: true, default: null })
  sellerApplicationNotes: string | null;

  @Column({ type: 'varchar', nullable: true })
  otp: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
