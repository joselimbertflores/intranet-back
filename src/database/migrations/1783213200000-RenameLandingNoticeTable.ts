import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLandingNoticeTable1783213200000 implements MigrationInterface {
  name = 'RenameLandingNoticeTable1783213200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.landing_modal_notices') IS NOT NULL
          AND to_regclass('public.landing_notices') IS NULL THEN
          ALTER TABLE "landing_modal_notices" RENAME TO "landing_notices";
        END IF;

        IF to_regclass('public."IDX_9ef6d5d3981d951c4cc15d0baf"') IS NOT NULL
          AND to_regclass('public."IDX_5db23f034f1a899cc1910c1b87"') IS NULL THEN
          ALTER INDEX "IDX_9ef6d5d3981d951c4cc15d0baf"
            RENAME TO "IDX_5db23f034f1a899cc1910c1b87";
        END IF;
      END
      $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.landing_notices') IS NOT NULL
          AND to_regclass('public.landing_modal_notices') IS NULL THEN
          ALTER TABLE "landing_notices" RENAME TO "landing_modal_notices";
        END IF;

        IF to_regclass('public."IDX_5db23f034f1a899cc1910c1b87"') IS NOT NULL
          AND to_regclass('public."IDX_9ef6d5d3981d951c4cc15d0baf"') IS NULL THEN
          ALTER INDEX "IDX_5db23f034f1a899cc1910c1b87"
            RENAME TO "IDX_9ef6d5d3981d951c4cc15d0baf";
        END IF;
      END
      $$;
    `);
  }
}
