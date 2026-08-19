import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string[]> = new Map();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token as string;
      if (token) {
        const payload = this.jwtService.verify(token);
        client.userId = payload.sub;
        client.userName = payload.email;
      }
    } catch {
      // Connection allowed without auth for now
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { transactionId: string },
  ) {
    if (!client.userId) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }
    client.join(data.transactionId);

    const rooms = this.connectedUsers.get(client.userId) || [];
    rooms.push(data.transactionId);
    this.connectedUsers.set(client.userId, rooms);

    const messages = await this.chatService.getMessages(data.transactionId);
    client.emit('chat_history', messages);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { transactionId: string },
  ) {
    client.leave(data.transactionId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      transactionId: string;
      content: string;
      type?: 'text' | 'image' | 'file';
      fileUrl?: string;
    },
  ) {
    if (!client.userId) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    const message = await this.chatService.sendMessage(
      data.transactionId,
      client.userId,
      client.userName || 'Unknown',
      data.content,
      data.type || 'text',
      data.fileUrl || '',
    );

    this.server.to(data.transactionId).emit('new_message', message);
    return { event: 'message_sent', data: message };
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    const message = await this.chatService.markAsRead(data.messageId);
    if (message) {
      this.server
        .to(message.transactionId)
        .emit('message_read', { messageId: data.messageId });
    }
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { transactionId: string },
  ) {
    if (!client.userId) return;
    const count = await this.chatService.markAllAsRead(
      data.transactionId,
      client.userId,
    );
    this.server
      .to(data.transactionId)
      .emit('all_read', { userId: client.userId, count });
  }


  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { transactionId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;
    client
      .to(data.transactionId)
      .emit('user_typing', {
        userId: client.userId,
        isTyping: data.isTyping,
      });
  }
}
