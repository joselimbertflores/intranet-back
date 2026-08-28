import { MigrationInterface, QueryRunner } from 'typeorm';

export class TutorialCoverImages1788037200000 implements MigrationInterface {
  name = 'TutorialCoverImages1788037200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tutorials" ADD "coverImageFileId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "tutorials" ADD CONSTRAINT "UQ_tutorials_coverImageFileId" UNIQUE ("coverImageFileId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tutorials" ADD CONSTRAINT "FK_tutorials_coverImageFileId" FOREIGN KEY ("coverImageFileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tutorials" DROP CONSTRAINT "FK_tutorials_coverImageFileId"`);
    await queryRunner.query(`ALTER TABLE "tutorials" DROP CONSTRAINT "UQ_tutorials_coverImageFileId"`);
    await queryRunner.query(`ALTER TABLE "tutorials" DROP COLUMN "coverImageFileId"`);
  }
}
