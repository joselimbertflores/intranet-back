import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDocumentOrganizationalUnitOptional1784851200000 implements MigrationInterface {
  name = 'MakeDocumentOrganizationalUnitOptional1784851200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "organizational_unit_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "organizational_unit_id" SET NOT NULL`);
  }
}
