import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async sendMessage(
    transactionId: string,
    senderId: string,
    senderName: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    fileUrl: string = '',
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      id: uuidv4(),
      transactionId,
      senderId,
      senderName,
      content,
      type,
      fileUrl,
      readAt: null,
      createdAt: new Date(),
    });
    return this.chatMessageRepository.save(message);
  }

  async getMessages(transactionId: string): Promise<ChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { transactionId },
      order: { createdAt: 'ASC' },
    });
  }

  async markAsRead(messageId: string): Promise<ChatMessage | null> {
    const message = await this.chatMessageRepository.findOne({ where: { id: messageId } });
    if (message && !message.readAt) {
      message.readAt = new Date();
      await this.chatMessageRepository.save(message);
    }
    return message;
  }

  async markAllAsRead(transactionId: string, userId: string): Promise<number> {
    const unreadMessages = await this.chatMessageRepository.find({
      where: {
        transactionId,
        readAt: IsNull(),
      },
    });

    let count = 0;
    const now = new Date();
    for (const message of unreadMessages) {
      if (message.senderId !== userId) {
        message.readAt = now;
        await this.chatMessageRepository.save(message);
        count++;
      }
    }
    return count;
  }

  async getUnreadCount(transactionId: string, userId: string): Promise<number> {
    const unreadMessages = await this.chatMessageRepository.find({
      where: {
        transactionId,
        readAt: IsNull(),
      },
    });

    return unreadMessages.filter((m) => m.senderId !== userId).length;
  }
}


