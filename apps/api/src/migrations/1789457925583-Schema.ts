import { MigrationInterface, QueryRunner } from "typeorm";

export class Schema1789457925583 implements MigrationInterface {
    name = 'Schema1789457925583'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "google_id" character varying NOT NULL, "email" character varying NOT NULL, "name" character varying NOT NULL, "avatar_url" character varying, "phone" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b" UNIQUE ("google_id"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."requests_blood_group_enum" AS ENUM('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG')`);
        await queryRunner.query(`CREATE TYPE "public"."requests_component_type_enum" AS ENUM('WHOLE_BLOOD', 'PLATELETS', 'PLASMA', 'RBC', 'CRYO')`);
        await queryRunner.query(`CREATE TYPE "public"."requests_urgency_enum" AS ENUM('CRITICAL', 'URGENT', 'NORMAL')`);
        await queryRunner.query(`CREATE TYPE "public"."requests_status_enum" AS ENUM('OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'EXPIRED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requester_id" uuid NOT NULL, "blood_group" "public"."requests_blood_group_enum" NOT NULL, "component_type" "public"."requests_component_type_enum" NOT NULL DEFAULT 'WHOLE_BLOOD', "units_needed" smallint NOT NULL DEFAULT '1', "units_fulfilled" smallint NOT NULL DEFAULT '0', "urgency" "public"."requests_urgency_enum" NOT NULL DEFAULT 'NORMAL', "location" geography(Point,4326) NOT NULL, "area_name" character varying NOT NULL, "hospital_name" character varying, "patient_note" text, "contact_phone" character varying NOT NULL, "status" "public"."requests_status_enum" NOT NULL DEFAULT 'OPEN', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0428f484e96f9e6a55955f29b5f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."responses_status_enum" AS ENUM('OFFERED', 'ACCEPTED', 'DECLINED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_id" uuid NOT NULL, "donor_id" uuid NOT NULL, "status" "public"."responses_status_enum" NOT NULL DEFAULT 'OFFERED', "message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ecb513d2826c0c2aa19bba78c31" UNIQUE ("request_id", "donor_id"), CONSTRAINT "PK_be3bdac59bd243dff421ad7bf70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "push_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "endpoint" text NOT NULL, "p256dh" text NOT NULL, "auth" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_5c9e93b19464f3fe704acf0c4bc" UNIQUE ("user_id", "endpoint"), CONSTRAINT "PK_757fc8f00c34f66832668dc2e53" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."reports_target_type_enum" AS ENUM('USER', 'REQUEST')`);
        await queryRunner.query(`CREATE TYPE "public"."reports_status_enum" AS ENUM('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED')`);
        await queryRunner.query(`CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reporter_id" uuid NOT NULL, "target_type" "public"."reports_target_type_enum" NOT NULL, "target_id" uuid NOT NULL, "reason" text NOT NULL, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'PENDING', "reviewed_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reviewed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."donor_profiles_blood_group_enum" AS ENUM('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG')`);
        await queryRunner.query(`CREATE TABLE "donor_profiles" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "blood_group" "public"."donor_profiles_blood_group_enum" NOT NULL, "location" geography(Point,4326) NOT NULL, "area_name" character varying NOT NULL, "last_donation_date" date, "is_available" boolean NOT NULL DEFAULT true, "bio" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ca54e5805ecbd7ab330b81910d6" UNIQUE ("user_id"), CONSTRAINT "REL_ca54e5805ecbd7ab330b81910d" UNIQUE ("user_id"), CONSTRAINT "PK_c7eb1ad8d75cb2211177598eb72" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "admin_id" uuid NOT NULL, "action" character varying NOT NULL, "target_type" character varying NOT NULL, "target_id" uuid NOT NULL, "meta" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "donations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "response_id" uuid NOT NULL, "donation_date" date NOT NULL, "confirmed_by_donor" boolean NOT NULL DEFAULT false, "confirmed_by_requester" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_eb738b53f1f2ffa7cf60420e769" UNIQUE ("response_id"), CONSTRAINT "REL_eb738b53f1f2ffa7cf60420e76" UNIQUE ("response_id"), CONSTRAINT "PK_c01355d6f6f50fc6d1b4a946abf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "requests" ADD CONSTRAINT "FK_394fe48b64d0de79ad6159ed28c" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "responses" ADD CONSTRAINT "FK_7ce06a0e2d5161af927eb879c13" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "responses" ADD CONSTRAINT "FK_eb7d4d76ed8ed0a1b92e30fd21c" FOREIGN KEY ("donor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "push_subscriptions" ADD CONSTRAINT "FK_6771f119f1c06d2ccf38f238664" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_e8fa0bffcaebc921b1e8e42a82f" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donor_profiles" ADD CONSTRAINT "FK_ca54e5805ecbd7ab330b81910d6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_b29de603374cbfa7d776d88e5b5" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "donations" ADD CONSTRAINT "FK_eb738b53f1f2ffa7cf60420e769" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donations" DROP CONSTRAINT "FK_eb738b53f1f2ffa7cf60420e769"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_b29de603374cbfa7d776d88e5b5"`);
        await queryRunner.query(`ALTER TABLE "donor_profiles" DROP CONSTRAINT "FK_ca54e5805ecbd7ab330b81910d6"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_e8fa0bffcaebc921b1e8e42a82f"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_9459b9bf907a3807ef7143d2ead"`);
        await queryRunner.query(`ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_6771f119f1c06d2ccf38f238664"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_eb7d4d76ed8ed0a1b92e30fd21c"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_7ce06a0e2d5161af927eb879c13"`);
        await queryRunner.query(`ALTER TABLE "requests" DROP CONSTRAINT "FK_394fe48b64d0de79ad6159ed28c"`);
        await queryRunner.query(`DROP TABLE "donations"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "donor_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."donor_profiles_blood_group_enum"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reports_target_type_enum"`);
        await queryRunner.query(`DROP TABLE "push_subscriptions"`);
        await queryRunner.query(`DROP TABLE "responses"`);
        await queryRunner.query(`DROP TYPE "public"."responses_status_enum"`);
        await queryRunner.query(`DROP TABLE "requests"`);
        await queryRunner.query(`DROP TYPE "public"."requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."requests_urgency_enum"`);
        await queryRunner.query(`DROP TYPE "public"."requests_component_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."requests_blood_group_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
