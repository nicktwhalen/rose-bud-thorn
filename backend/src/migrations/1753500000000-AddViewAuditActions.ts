import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewAuditActions1753500000000 implements MigrationInterface {
  name = 'AddViewAuditActions1753500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new audit action types to the enum
    await queryRunner.query(`
      ALTER TYPE "audit_logs_action_enum" 
      ADD VALUE IF NOT EXISTS 'VIEW_ENTRY'
    `);

    await queryRunner.query(`
      ALTER TYPE "audit_logs_action_enum" 
      ADD VALUE IF NOT EXISTS 'VIEW_ENTRIES'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support dropping enum values directly
    // This would require recreating the enum type and updating all references
    // For production, consider if rollback is necessary or create a new migration
    console.log('Rollback: Cannot remove enum values in PostgreSQL without recreating the type');
  }
}
