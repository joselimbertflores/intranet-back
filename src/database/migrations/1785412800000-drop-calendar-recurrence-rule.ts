import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCalendarRecurrenceRule1785412800000 implements MigrationInterface {
  name = 'DropCalendarRecurrenceRule1785412800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "calendar_events" DROP COLUMN "recurrenceRule"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "calendar_events" ADD "recurrenceRule" character varying`);
  }
}
