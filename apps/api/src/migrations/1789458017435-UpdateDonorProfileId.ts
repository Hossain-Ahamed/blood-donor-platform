import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateDonorProfileId1789458017435 implements MigrationInterface {
    name = 'UpdateDonorProfileId1789458017435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donor_profiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donor_profiles" ALTER COLUMN "id" DROP DEFAULT`);
    }

}
