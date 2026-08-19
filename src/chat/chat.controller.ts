import { Controller, Get, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private transactionsService: TransactionsService,
  ) {}

  @Get('conversations')
  async getConversations(@CurrentUser() user: { userId: string }) {
    const transactions = await this.transactionsService.findByUser(user.userId);
    const conversations = await Promise.all(
      transactions.map(async (t) => {
        const messages = await this.chatService.getMessages(t.id);
        const lastMessage = messages[messages.length - 1];
        const unread = await this.chatService.getUnreadCount(t.id, user.userId);
        const otherId = t.buyerId === user.userId ? t.sellerId : t.buyerId;
        return {
          id: t.id,
          transactionId: t.id,
          otherUserId: otherId,
          lastMessage: lastMessage?.content || null,
          lastMessageAt: lastMessage?.createdAt || t.createdAt,
          unread,
          status: t.status,
        };
      }),
    );

    conversations.sort((a, b) => {
      if (!a.lastMessageAt || !b.lastMessageAt) return 0;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    return { success: true, data: conversations };
  }
}
