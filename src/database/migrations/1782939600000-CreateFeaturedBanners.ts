import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateFeaturedBanners1782939600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'featured_banners',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'title', type: 'varchar', length: '120' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'linkLabel', type: 'varchar', length: '80', isNullable: true },
          { name: 'url', type: 'text', isNullable: true },
          { name: 'imageFileId', type: 'uuid', isUnique: true },
          { name: 'sortOrder', type: 'integer', default: '0' },
          { name: 'isActive', type: 'boolean', default: true },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'featured_banners',
      new TableForeignKey({
        name: 'FK_featured_banners_image_file',
        columnNames: ['imageFileId'],
        referencedTableName: 'files',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'featured_banners',
      new TableIndex({
        name: 'IDX_featured_banners_active_sort_order',
        columnNames: ['isActive', 'sortOrder'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('featured_banners');
  }
}
