import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryColumn()
  id: string;

  @Column()
  transactionId: string;

  @Column()
  senderId: string;

  @Column()
  senderName: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', default: 'text' })
  type: 'text' | 'image' | 'file';

  @Column({ default: '' })
  fileUrl: string;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
