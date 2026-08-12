import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDirectorySiteCoordinates1786572592712 implements MigrationInterface {
    name = 'AddDirectorySiteCoordinates1786572592712'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "directory_sites" ADD "latitude" double precision`);
        await queryRunner.query(`ALTER TABLE "directory_sites" ADD "longitude" double precision`);
        await queryRunner.query(`ALTER TABLE "directory_entries" ALTER COLUMN "extensions" SET DEFAULT '{}'::text[]`);
        await queryRunner.query(`ALTER TABLE "directory_entries" ALTER COLUMN "phones" SET DEFAULT '{}'::text[]`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "directory_entries" ALTER COLUMN "phones" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "directory_entries" ALTER COLUMN "extensions" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "directory_sites" DROP COLUMN "longitude"`);
        await queryRunner.query(`ALTER TABLE "directory_sites" DROP COLUMN "latitude"`);
    }

}
