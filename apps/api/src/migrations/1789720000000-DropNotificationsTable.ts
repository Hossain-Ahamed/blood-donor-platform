import { MigrationInterface, QueryRunner } from "typeorm";

export class DropNotificationsTable1789720000000 implements MigrationInterface {
  name = "DropNotificationsTable1789720000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversible if ever needed
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "type" character varying(50) NOT NULL DEFAULT 'GENERAL',
        "link" character varying(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
  }
}
