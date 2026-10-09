import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeliveryToTransactions1700000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('transactions', [
      new TableColumn({
        name: 'deliveryNotes',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'deliveredAt',
        type: 'datetime',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('transactions', 'deliveredAt');
    await queryRunner.dropColumn('transactions', 'deliveryNotes');
  }
}
