import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRejectionReasonToResponses1789700000000 implements MigrationInterface {
    name = 'AddRejectionReasonToResponses1789700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "responses" ADD COLUMN IF NOT EXISTS "rejection_reason" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "responses" DROP COLUMN IF EXISTS "rejection_reason"`);
    }
}

