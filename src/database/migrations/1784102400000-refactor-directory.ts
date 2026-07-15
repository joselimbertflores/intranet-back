import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorDirectory1784102400000 implements MigrationInterface {
  name = 'RefactorDirectory1784102400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "directory_sites" (
        "id" SERIAL NOT NULL,
        "name" character varying(120) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_directory_sites_name" UNIQUE ("name"),
        CONSTRAINT "PK_directory_sites" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "areaName" character varying(160)`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "contactLabel" character varying(160)`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "extensions" text array NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "phones" text array NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "email" character varying(160)`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "siteId" integer`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "siteDetails" character varying(200)`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "isActive" boolean NOT NULL DEFAULT true`);

    await queryRunner.query(`UPDATE "directory_entries" SET "areaName" = "name"`);
    await queryRunner.query(`
      UPDATE "directory_entries"
      SET "extensions" = ARRAY[TRIM("internalPhone")]
      WHERE NULLIF(TRIM("internalPhone"), '') IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "directory_entries"
      SET "phones" = ARRAY[TRIM("landlinePhone")]
      WHERE NULLIF(TRIM("landlinePhone"), '') IS NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE "directory_entries" ALTER COLUMN "areaName" SET NOT NULL`);

    await queryRunner.query(`
      DO $$
      DECLARE constraint_name text;
      BEGIN
        SELECT tc.constraint_name INTO constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name AND tc.constraint_schema = ccu.constraint_schema
        WHERE tc.table_name = 'directory_entries'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'directory_entries'
        LIMIT 1;

        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "directory_entries" DROP CONSTRAINT %I', constraint_name);
        END IF;
      END $$
    `);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN IF EXISTS "parentId"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "internalPhone"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "landlinePhone"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "order"`);
    await queryRunner.query(`
      ALTER TABLE "directory_entries"
      ADD CONSTRAINT "FK_directory_entries_site"
      FOREIGN KEY ("siteId") REFERENCES "directory_sites"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX "IDX_directory_entries_area_name" ON "directory_entries" ("areaName")`);
    await queryRunner.query(`CREATE INDEX "IDX_directory_entries_site" ON "directory_entries" ("siteId")`);
    await queryRunner.query(`CREATE INDEX "IDX_directory_entries_active" ON "directory_entries" ("isActive")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_directory_entries_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_directory_entries_site"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_directory_entries_area_name"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP CONSTRAINT "FK_directory_entries_site"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "name" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "internalPhone" character varying`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "landlinePhone" character varying`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "parentId" integer`);
    await queryRunner.query(`ALTER TABLE "directory_entries" ADD "order" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`
      UPDATE "directory_entries"
      SET "name" = "areaName",
          "internalPhone" = "extensions"[1],
          "landlinePhone" = "phones"[1]
    `);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "siteDetails"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "siteId"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "email"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "phones"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "extensions"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "contactLabel"`);
    await queryRunner.query(`ALTER TABLE "directory_entries" DROP COLUMN "areaName"`);
    await queryRunner.query(`
      ALTER TABLE "directory_entries"
      ADD CONSTRAINT "FK_directory_entries_parent"
      FOREIGN KEY ("parentId") REFERENCES "directory_entries"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`DROP TABLE "directory_sites"`);
  }
}
