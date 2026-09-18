import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReadStatusToNotifications1789710000000 implements MigrationInterface {
  name = "AddReadStatusToNotifications1789710000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add read status columns
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP WITH TIME ZONE`,
    );

    // 2. High performance indexes
    // Timeline list queries: order by created_at DESC for a user
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_created" ON "notifications" ("user_id", "created_at" DESC)`,
    );

    // Filtered queries: user_id + is_read + created_at DESC
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_is_read_created" ON "notifications" ("user_id", "is_read", "created_at" DESC)`,
    );

    // Partial index for unread count optimization:
    // Only indexes rows where is_read = false, keeping the index microscopic and unread COUNT(*) blazing fast
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user_unread_partial" ON "notifications" ("user_id") WHERE is_read = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_user_unread_partial"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_user_is_read_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notifications_user_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "read_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "is_read"`,
    );
  }
}
