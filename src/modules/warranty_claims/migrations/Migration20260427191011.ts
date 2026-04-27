import { Migration } from '@mikro-orm/migrations';

export class Migration20260427191011 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "warranty_claims_claims" add column "rejection_reason" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "warranty_claims_claims" drop column "rejection_reason";`);
  }

}
