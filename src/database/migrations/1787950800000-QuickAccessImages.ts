import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuickAccessImages1787950800000 implements MigrationInterface {
  name = 'QuickAccessImages1787950800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."files_context_enum" ADD VALUE IF NOT EXISTS 'quick-accesses'`);
    await queryRunner.query(`ALTER TABLE "quick_accesses" ADD "imageFileId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "quick_accesses" ADD CONSTRAINT "UQ_quick_accesses_imageFileId" UNIQUE ("imageFileId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "quick_accesses" ADD CONSTRAINT "FK_quick_accesses_imageFileId" FOREIGN KEY ("imageFileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "quick_accesses" DROP COLUMN "iconKey"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quick_accesses" ADD "iconKey" character varying(40)`);
    await queryRunner.query(`UPDATE "quick_accesses" SET "iconKey" = 'external-link' WHERE "iconKey" IS NULL`);
    await queryRunner.query(`ALTER TABLE "quick_accesses" ALTER COLUMN "iconKey" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "quick_accesses" DROP CONSTRAINT "FK_quick_accesses_imageFileId"`);
    await queryRunner.query(`ALTER TABLE "quick_accesses" DROP CONSTRAINT "UQ_quick_accesses_imageFileId"`);
    await queryRunner.query(`ALTER TABLE "quick_accesses" DROP COLUMN "imageFileId"`);
    // PostgreSQL cannot safely remove an enum value while file rows may still use it.
  }
}
