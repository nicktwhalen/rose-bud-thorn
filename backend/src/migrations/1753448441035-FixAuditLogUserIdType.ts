import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAuditLogUserIdType1753448441035 implements MigrationInterface {
  name = 'FixAuditLogUserIdType1753448441035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint first
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`);

    // Change the column type from integer to uuid
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::text::uuid`);

    // Re-add the foreign key constraint
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`);

    // Change the column type back to integer
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "user_id" TYPE integer USING "user_id"::text::integer`);

    // Re-add the foreign key constraint
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }
}
