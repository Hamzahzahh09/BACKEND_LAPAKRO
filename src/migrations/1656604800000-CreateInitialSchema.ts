import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateInitialSchema1656604800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            length: '255',
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            default: "''",
          },
          {
            name: 'bio',
            type: 'text',
            default: "''",
          },
          {
            name: 'photo',
            type: 'varchar',
            length: '255',
            default: "''",
          },
          {
            name: 'mode',
            type: 'varchar',
            length: '20',
            default: "'buyer'",
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            default: "'user'",
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'referralCode',
            type: 'varchar',
            length: '255',
            default: "''",
          },
          {
            name: 'kycLevel',
            type: 'int',
            default: 0,
          },
          {
            name: 'isBanned',
            type: 'boolean',
            default: false,
          },
          {
            name: 'sellerApplicationStatus',
            type: 'varchar',
            length: '20',
            default: "'none'",
          },
          {
            name: 'sellerApplicationNotes',
            type: 'text',
            default: "''",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_users_email',
            columnNames: ['email'],
            isUnique: true,
          },
          {
            name: 'IDX_users_role',
            columnNames: ['role'],
          },
          {
            name: 'IDX_users_mode',
            columnNames: ['mode'],
          },
        ],
      }),
      true,
    );

    // Products table
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'sellerId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'stock',
            type: 'int',
          },
          {
            name: 'images',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'proofFiles',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'averageRating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'reviewCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'soldCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'deliveryMethod',
            type: 'varchar',
            length: '50',
            default: "'instant'",
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'rejectionReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_products_sellerId',
            columnNames: ['sellerId'],
          },
          {
            name: 'IDX_products_category',
            columnNames: ['category'],
          },
          {
            name: 'IDX_products_status',
            columnNames: ['status'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_products_seller',
            columnNames: ['sellerId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Transactions table
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'buyerId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'sellerId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'productId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'quantity',
            type: 'int',
          },
          {
            name: 'totalPrice',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'pending_payment'",
          },
          {
            name: 'escrowReleased',
            type: 'boolean',
            default: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cancelledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_transactions_buyerId',
            columnNames: ['buyerId'],
          },
          {
            name: 'IDX_transactions_sellerId',
            columnNames: ['sellerId'],
          },
          {
            name: 'IDX_transactions_status',
            columnNames: ['status'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_transactions_buyer',
            columnNames: ['buyerId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_transactions_seller',
            columnNames: ['sellerId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_transactions_product',
            columnNames: ['productId'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Wallet table
    await queryRunner.createTable(
      new Table({
        name: 'wallet',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
            isUnique: true,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalDeposited',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalWithdrawn',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_wallet_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Payments table
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'method',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'vaNumber',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'paymentUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_payments_userId',
            columnNames: ['userId'],
          },
          {
            name: 'IDX_payments_status',
            columnNames: ['status'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_payments_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Reviews table
    await queryRunner.createTable(
      new Table({
        name: 'reviews',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'productId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'sellerId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'buyerId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'rating',
            type: 'int',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'images',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'reply',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'repliedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_reviews_transaction',
            columnNames: ['transactionId'],
            referencedTableName: 'transactions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_reviews_product',
            columnNames: ['productId'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Disputes table
    await queryRunner.createTable(
      new Table({
        name: 'disputes',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'buyerId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'sellerId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'evidence',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'open'",
          },
          {
            name: 'resolution',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'winnerId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'adminNote',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_disputes_transaction',
            columnNames: ['transactionId'],
            referencedTableName: 'transactions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Chat Messages table
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'senderId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'text'",
          },
          {
            name: 'fileUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'readAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_chat_messages_transactionId',
            columnNames: ['transactionId'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_chat_messages_transaction',
            columnNames: ['transactionId'],
            referencedTableName: 'transactions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Wallet Transactions table
    await queryRunner.createTable(
      new Table({
        name: 'wallet_transactions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            length: '36',
          },
          {
            name: 'walletId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'fee',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'referenceId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_wallet_transactions_wallet',
            columnNames: ['walletId'],
            referencedTableName: 'wallet',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('wallet_transactions', true);
    await queryRunner.dropTable('chat_messages', true);
    await queryRunner.dropTable('disputes', true);
    await queryRunner.dropTable('reviews', true);
    await queryRunner.dropTable('payments', true);
    await queryRunner.dropTable('wallet', true);
    await queryRunner.dropTable('transactions', true);
    await queryRunner.dropTable('products', true);
    await queryRunner.dropTable('users', true);
  }
}
