import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBioAndDateOfBirth1789656871537 implements MigrationInterface {
    name = 'AddBioAndDateOfBirth1789656871537'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donor_profiles" ADD "date_of_birth" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donor_profiles" DROP COLUMN "date_of_birth"`);
    }

}
