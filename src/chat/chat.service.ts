import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from './entities/chat-message.entity';
import { Conversation } from './entities/conversation.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

export interface PopulatedConversation {
  id: string;
  buyerId: string;
  sellerId: string;
  transactionId: string | null;
  productId: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unread: number;
  otherUser: {
    id: string;
    name: string;
    email: string;
    photo: string;
    role: string;
    isVerified: boolean;
  };
  product?: {
    id: string;
    title: string;
    price: number;
    category: string;
    image: string;
  } | null;
  transaction?: {
    id: string;
    status: string;
    totalPrice: number;
    quantity: number;
    notes?: string;
    createdAt?: Date;
  } | null;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Cari percakapan antara buyer dan seller. Jika belum ada, buat baru secara dinamis.
   * Menjamin tidak ada user dummy dan tidak ada duplikasi conversation.
   */
  async getOrCreateConversation(
    userId: string,
    sellerId: string,
    transactionId?: string,
    productId?: string,
  ): Promise<Conversation> {
    if (userId === sellerId) {
      throw new BadRequestException('Tidak dapat memulai percakapan dengan diri sendiri');
    }

    // Pastikan akun seller benar-benar terdaftar di database
    const seller = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Akun seller tidak ditemukan');
    }

    // 1. Cek apakah sudah ada percakapan antara kedua user (baik sebagai buyer maupun seller)
    let conversation = await this.conversationRepository.findOne({
      where: [
        { buyerId: userId, sellerId: sellerId },
        { buyerId: sellerId, sellerId: userId },
      ],
    });

    const now = new Date();

    if (!conversation) {
      // 2. Jika belum pernah chat, buat conversation baru
      conversation = this.conversationRepository.create({
        id: uuidv4(),
        buyerId: userId,
        sellerId: sellerId,
        transactionId: transactionId ?? null,
        productId: productId ?? null,
        lastMessage: null,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      });
      conversation = await this.conversationRepository.save(conversation);
    } else {
      // 3. Jika sudah ada, update konteks order/product jika ada order baru
      let updated = false;
      if (transactionId && conversation.transactionId !== transactionId) {
        conversation.transactionId = transactionId;
        updated = true;
      }
      if (productId && conversation.productId !== productId) {
        conversation.productId = productId;
        updated = true;
      }
      if (updated) {
        conversation.updatedAt = now;
        conversation = await this.conversationRepository.save(conversation);
      }
    }

    return conversation;
  }

  /**
   * Ambil daftar percakapan milik user beserta identitas lawan chat (nama asli, foto, produk terkait).
   */
  async getConversations(userId: string): Promise<PopulatedConversation[]> {
    // 1. Ambil semua percakapan yang melibatkan user ini
    const convs = await this.conversationRepository.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      order: { updatedAt: 'DESC' },
    });

    // 2. Sinkronkan riwayat transaksi masa lalu agar transaksi yang belum punya record conversation otomatis dibuatkan
    const pastTransactions = await this.transactionRepository.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      order: { createdAt: 'DESC' },
    });

    for (const trx of pastTransactions) {
      const otherId = trx.buyerId === userId ? trx.sellerId : trx.buyerId;
      const exists = convs.some(
        (c) =>
          (c.buyerId === userId && c.sellerId === otherId) ||
          (c.buyerId === otherId && c.sellerId === userId),
      );

      if (!exists) {
        const newConv = this.conversationRepository.create({
          id: trx.id,
          buyerId: trx.buyerId,
          sellerId: trx.sellerId,
          transactionId: trx.id,
          productId: trx.productId,
          lastMessage: null,
          lastMessageAt: trx.createdAt,
          createdAt: trx.createdAt,
          updatedAt: trx.updatedAt,
        });
        const saved = await this.conversationRepository.save(newConv);
        convs.push(saved);
      }
    }

    if (convs.length === 0) {
      return [];
    }

    // 3. Kumpulkan ID user, product, dan transaction untuk batch fetching (mencegah N+1 query)
    const otherUserIds = Array.from(
      new Set(convs.map((c) => (c.buyerId === userId ? c.sellerId : c.buyerId))),
    );
    const productIds = Array.from(
      new Set(convs.map((c) => c.productId).filter((id): id is string => Boolean(id))),
    );
    const transactionIds = Array.from(
      new Set(convs.map((c) => c.transactionId).filter((id): id is string => Boolean(id))),
    );

    const users: User[] =
      otherUserIds.length > 0
        ? await this.userRepository.find({ where: { id: In(otherUserIds) } })
        : [];
    const products: Product[] =
      productIds.length > 0
        ? await this.productRepository.find({ where: { id: In(productIds) } })
        : [];
    const transactions: Transaction[] =
      transactionIds.length > 0
        ? await this.transactionRepository.find({ where: { id: In(transactionIds) } })
        : [];

    const userMap = new Map<string, User>();
    for (const u of users) {
      userMap.set(u.id, u);
    }

    const productMap = new Map<string, Product>();
    for (const p of products) {
      productMap.set(p.id, p);
    }

    const transactionMap = new Map<string, Transaction>();
    for (const t of transactions) {
      transactionMap.set(t.id, t);
    }

    // 4. Susun respon percakapan dengan detail lengkap
    const populated: PopulatedConversation[] = await Promise.all(
      convs.map(async (conv) => {
        const otherId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
        const otherUser = userMap.get(otherId);

        // Cari transaksi terkait
        let trx: Transaction | undefined = conv.transactionId
          ? transactionMap.get(conv.transactionId)
          : undefined;
        let prod: Product | undefined = conv.productId
          ? productMap.get(conv.productId)
          : undefined;
        if (!prod && trx?.productId) {
          prod = productMap.get(trx.productId);
        }

        // Ambil pesan terakhir jika belum tercatat di conversation
        let lastMsg = conv.lastMessage ?? null;
        let lastMsgAt = conv.lastMessageAt ?? null;
        if (!lastMsg) {
          const msgs = await this.chatMessageRepository.find({
            where: { transactionId: conv.id },
            order: { createdAt: 'DESC' },
            take: 1,
          });
          if (msgs.length > 0) {
            lastMsg = msgs[0].content;
            lastMsgAt = msgs[0].createdAt;
          }
        }

        const unreadCount = await this.getUnreadCount(conv.id, userId);

        return {
          id: conv.id,
          buyerId: conv.buyerId,
          sellerId: conv.sellerId,
          transactionId: conv.transactionId ?? null,
          productId: conv.productId ?? null,
          lastMessage: lastMsg,
          lastMessageAt: lastMsgAt,
          unread: unreadCount,
          otherUser: {
            id: otherId,
            name: otherUser?.name ?? 'Pengguna',
            email: otherUser?.email ?? '',
            photo: otherUser?.photo ?? '',
            role: otherUser?.role ?? 'user',
            isVerified: otherUser?.isVerified ?? false,
          },
          product: prod
            ? {
                id: prod.id,
                title: prod.title,
                price: Number(prod.price),
                category: prod.category,
                image: prod.images?.[0] ?? '',
              }
            : null,
          transaction: trx
            ? {
                id: trx.id,
                status: trx.status,
                totalPrice: Number(trx.totalPrice),
                quantity: trx.quantity,
                notes: trx.notes ?? '',
                createdAt: trx.createdAt,
              }
            : null,
        };
      }),
    );

    // Urutkan percakapan dari yang paling baru
    populated.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    return populated;
  }

  /**
   * Ambil detail percakapan tunggal berdasarkan conversation ID.
   */
  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<PopulatedConversation> {
    const conv = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conv) {
      throw new NotFoundException('Percakapan tidak ditemukan');
    }

    if (conv.buyerId !== userId && conv.sellerId !== userId) {
      throw new ForbiddenException('Akses ke percakapan ini ditolak');
    }

    const otherId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
    const [otherUser, product, transaction, unread] = await Promise.all([
      this.userRepository.findOne({ where: { id: otherId } }),
      conv.productId ? this.productRepository.findOne({ where: { id: conv.productId } }) : null,
      conv.transactionId
        ? this.transactionRepository.findOne({ where: { id: conv.transactionId } })
        : null,
      this.getUnreadCount(conv.id, userId),
    ]);

    return {
      id: conv.id,
      buyerId: conv.buyerId,
      sellerId: conv.sellerId,
      transactionId: conv.transactionId ?? null,
      productId: conv.productId ?? null,
      lastMessage: conv.lastMessage ?? null,
      lastMessageAt: conv.lastMessageAt ?? null,
      unread,
      otherUser: {
        id: otherId,
        name: otherUser?.name ?? 'Pengguna',
        email: otherUser?.email ?? '',
        photo: otherUser?.photo ?? '',
        role: otherUser?.role ?? 'user',
        isVerified: otherUser?.isVerified ?? false,
      },
      product: product
        ? {
            id: product.id,
            title: product.title,
            price: Number(product.price),
            category: product.category,
            image: product.images?.[0] ?? '',
          }
        : null,
      transaction: transaction
        ? {
            id: transaction.id,
            status: transaction.status,
            totalPrice: Number(transaction.totalPrice),
            quantity: transaction.quantity,
            notes: transaction.notes ?? '',
            createdAt: transaction.createdAt,
          }
        : null,
    };
  }

  /**
   * Kirim pesan baru ke percakapan dan perbarui timestamp percakapan.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    fileUrl = '',
  ): Promise<ChatMessage> {
    const now = new Date();
    const message = this.chatMessageRepository.create({
      id: uuidv4(),
      transactionId: conversationId,
      senderId,
      senderName,
      content,
      type,
      fileUrl,
      readAt: null,
      createdAt: now,
    });

    const savedMessage = await this.chatMessageRepository.save(message);

    // Update ringkasan lastMessage di tabel conversations jika ada
    await this.conversationRepository.update(
      { id: conversationId },
      {
        lastMessage: content,
        lastMessageAt: now,
        updatedAt: now,
      },
    );

    return savedMessage;
  }

  /**
   * Ambil semua pesan dalam suatu percakapan.
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { transactionId: conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Tandai pesan sebagai sudah dibaca.
   */
  async markAsRead(messageId: string): Promise<ChatMessage | null> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
    });
    if (message && !message.readAt) {
      message.readAt = new Date();
      await this.chatMessageRepository.save(message);
    }
    return message;
  }

  /**
   * Tandai semua pesan di percakapan sebagai dibaca oleh user yang sedang membuka chat.
   */
  async markAllAsRead(conversationId: string, userId: string): Promise<number> {
    const unreadMessages = await this.chatMessageRepository.find({
      where: {
        transactionId: conversationId,
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

  /**
   * Hitung jumlah pesan belum terbaca untuk user tertentu.
   */
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const unreadMessages = await this.chatMessageRepository.find({
      where: {
        transactionId: conversationId,
        readAt: IsNull(),
      },
    });

    return unreadMessages.filter((m) => m.senderId !== userId).length;
  }
}
