import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Cari percakapan dengan seller yang ada atau buat baru jika belum pernah chat.
   * Dipanggil saat menekan tombol "Hubungi Seller".
   */
  @Post('conversation')
  async getOrCreateConversation(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateConversationDto,
  ) {
    const conversation = await this.chatService.getOrCreateConversation(
      user.userId,
      dto.sellerId,
      dto.transactionId,
      dto.productId,
    );
    return {
      success: true,
      data: conversation,
      message: 'Conversation ready',
    };
  }

  /**
   * Ambil semua percakapan milik user (baik sebagai buyer maupun seller).
   */
  @Get('conversations')
  async getConversations(@CurrentUser() user: { userId: string }) {
    const conversations = await this.chatService.getConversations(user.userId);
    return { success: true, data: conversations };
  }

  /**
   * Ambil detail satu percakapan.
   */
  @Get('conversations/:id')
  async getConversation(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const conversation = await this.chatService.getConversationById(
      id,
      user.userId,
    );
    return { success: true, data: conversation };
  }

  /**
   * Ambil seluruh riwayat pesan untuk suatu percakapan.
   */
  @Get('messages/:id')
  async getMessages(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    // Validasi otorisasi bahwa user tergabung dalam percakapan
    await this.chatService.getConversationById(id, user.userId);
    const messages = await this.chatService.getMessages(id);
    return { success: true, data: messages };
  }

  /**
   * Kirim pesan baru dalam percakapan via REST API.
   */
  @Post('messages/:id')
  async sendMessage(
    @CurrentUser() user: { userId: string; name?: string; email?: string },
    @Param('id') id: string,
    @Body() body: { content: string; type?: 'text' | 'image' | 'file'; fileUrl?: string },
  ) {
    // Validasi otorisasi
    await this.chatService.getConversationById(id, user.userId);
    const message = await this.chatService.sendMessage(
      id,
      user.userId,
      user.name || user.email || 'Pengguna',
      body.content,
      body.type || 'text',
      body.fileUrl || '',
    );

    // Broadcast ke WebSocket room
    if (this.chatGateway?.broadcastToRoom) {
      this.chatGateway.broadcastToRoom(id, 'new_message', message);
    }

    return { success: true, data: message };
  }

  /**
   * Tandai semua pesan di percakapan sebagai dibaca.
   */
  @Patch('conversations/:id/read')
  async markRead(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    const count = await this.chatService.markAllAsRead(id, user.userId);
    return { success: true, data: { readCount: count } };
  }
}
