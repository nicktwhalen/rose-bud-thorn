import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndUpdateEntries1753100639903 implements MigrationInterface {
  name = 'CreateUsersAndUpdateEntries1753100639903';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "google_id" character varying NOT NULL, "email" character varying NOT NULL, "name" character varying NOT NULL, "picture" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b" UNIQUE ("google_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "entries" ("id" SERIAL NOT NULL, "date" date NOT NULL, "rose" text, "thorn" text, "bud" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "PK_23d4e7e9b58d9939f113832915b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_44b8bbcad451f61520a19f6999" ON "entries" ("user_id", "date") `);
    await queryRunner.query(`ALTER TABLE "entries" ADD CONSTRAINT "FK_73b250bca5e5a24e1343da56168" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "entries" DROP CONSTRAINT "FK_73b250bca5e5a24e1343da56168"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_44b8bbcad451f61520a19f6999"`);
    await queryRunner.query(`DROP TABLE "entries"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
