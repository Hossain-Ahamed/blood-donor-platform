import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileAndRequestFields1789458017436 implements MigrationInterface {
    name = 'AddProfileAndRequestFields1789458017436'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donor_profiles" ADD "age" smallint`);
        await queryRunner.query(`ALTER TABLE "donor_profiles" ADD "religion" character varying`);
        await queryRunner.query(`ALTER TABLE "donor_profiles" ADD "health_notes" text`);

        await queryRunner.query(`ALTER TABLE "requests" ADD "patient_name" character varying`);
        await queryRunner.query(`ALTER TABLE "requests" ADD "patient_age" smallint`);
        await queryRunner.query(`ALTER TABLE "requests" ADD "disease" character varying`);
        await queryRunner.query(`ALTER TABLE "requests" ADD "needed_time" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "requests" DROP COLUMN "needed_time"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP COLUMN "disease"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP COLUMN "patient_age"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP COLUMN "patient_name"`);

        await queryRunner.query(`ALTER TABLE "donor_profiles" DROP COLUMN "health_notes"`);
        await queryRunner.query(`ALTER TABLE "donor_profiles" DROP COLUMN "religion"`);
        await queryRunner.query(`ALTER TABLE "donor_profiles" DROP COLUMN "age"`);
    }
}

