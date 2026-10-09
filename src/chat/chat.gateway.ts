import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userName?: string;
}

@WebSocketGateway({
  path: '/ws/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly rooms: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: AuthenticatedWebSocket, req?: IncomingMessage) {
    try {
      const rawUrl = req?.url || (client as any)?.upgradeReq?.url || '';
      const url = new URL(rawUrl, 'http://localhost:3001');
      const token = url.searchParams.get('token');
      if (token) {
        const payload = this.jwtService.verify(token);
        client.userId = payload.sub;
        client.userName = payload.name || payload.email;
      }
    } catch {
      // Allowed without auth initially
    }
  }

  handleDisconnect(client: AuthenticatedWebSocket) {
    for (const [roomId, clients] of this.rooms.entries()) {
      clients.delete(client);
      if (clients.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  public broadcastToRoom(roomId: string, event: string, data: any) {
    const clients = this.rooms.get(roomId);
    if (!clients) return;
    const payload = JSON.stringify({ event, data });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody()
    data: {
      conversationId?: string;
      transactionId?: string;
      token?: string;
    },
  ) {
    if (!client.userId && data?.token) {
      try {
        const payload = this.jwtService.verify(data.token);
        client.userId = payload.sub;
        client.userName = payload.name || payload.email;
      } catch {
        // invalid token
      }
    }

    const roomId = data?.conversationId || data?.transactionId;
    if (!roomId) return;

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(client);

    const messages = await this.chatService.getMessages(roomId);
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event: 'chat_history', data: messages }));
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: { conversationId?: string; transactionId?: string },
  ) {
    const roomId = data?.conversationId || data?.transactionId;
    if (roomId && this.rooms.has(roomId)) {
      this.rooms.get(roomId)!.delete(client);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody()
    data: {
      conversationId?: string;
      transactionId?: string;
      content: string;
      token?: string;
      type?: 'text' | 'image' | 'file';
      fileUrl?: string;
    },
  ) {
    if (!client.userId && data?.token) {
      try {
        const payload = this.jwtService.verify(data.token);
        client.userId = payload.sub;
        client.userName = payload.name || payload.email;
      } catch {
        // invalid token
      }
    }

    if (!client.userId) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            event: 'error',
            data: { message: 'Not authenticated' },
          }),
        );
      }
      return;
    }
    const roomId = data?.conversationId || data?.transactionId;
    if (!roomId) return;

    const message = await this.chatService.sendMessage(
      roomId,
      client.userId,
      client.userName || 'Pengguna',
      data.content,
      data.type || 'text',
      data.fileUrl || '',
    );

    this.broadcastToRoom(roomId, 'new_message', message);
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: { messageId: string },
  ) {
    const message = await this.chatService.markAsRead(data.messageId);
    if (message) {
      this.broadcastToRoom(message.transactionId, 'message_read', {
        messageId: data.messageId,
      });
    }
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody() data: { conversationId?: string; transactionId?: string },
  ) {
    if (!client.userId) return;
    const roomId = data?.conversationId || data?.transactionId;
    if (!roomId) return;

    const count = await this.chatService.markAllAsRead(roomId, client.userId);
    this.broadcastToRoom(roomId, 'all_read', {
      userId: client.userId,
      count,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedWebSocket,
    @MessageBody()
    data: {
      conversationId?: string;
      transactionId?: string;
      isTyping: boolean;
    },
  ) {
    if (!client.userId) return;
    const roomId = data?.conversationId || data?.transactionId;
    if (!roomId) return;

    const payload = JSON.stringify({
      event: 'user_typing',
      data: { userId: client.userId, isTyping: data.isTyping },
    });
    const clients = this.rooms.get(roomId);
    if (clients) {
      for (const target of clients) {
        if (target !== client && target.readyState === WebSocket.OPEN) {
          target.send(payload);
        }
      }
    }
  }
}
