import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogTable1753448441034 implements MigrationInterface {
  name = 'CreateAuditLogTable1753448441034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'CREATE_ENTRY', 'UPDATE_ENTRY', 'DELETE_ENTRY')`);
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "user_id" uuid, "action" "public"."audit_logs_action_enum" NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "ip_address" character varying(45) NOT NULL, "user_agent" text, "resource_id" character varying, "details" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
  }
}
