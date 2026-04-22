import { Migration } from '@mikro-orm/migrations'

export class Migration20260422143000 extends Migration {

  override async up(): Promise<void> {
    this.addSql('alter table "warranty_claims_claims" add column "claim_number" int null;')
    this.addSql(`
      with numbered_claims as (
        select
          id,
          row_number() over (
            partition by organization_id, tenant_id, project_id
            order by created_at asc, id asc
          ) as next_claim_number
        from "warranty_claims_claims"
      )
      update "warranty_claims_claims" as claims
      set "claim_number" = numbered_claims.next_claim_number
      from numbered_claims
      where claims.id = numbered_claims.id;
    `)
    this.addSql('alter table "warranty_claims_claims" alter column "claim_number" set not null;')
    this.addSql('create index "warranty_claims_claims_claim_number_idx" on "warranty_claims_claims" ("claim_number");')
    this.addSql('alter table "warranty_claims_claims" add constraint "warranty_claims_claims_scope_project_claim_number_unique" unique ("organization_id", "tenant_id", "project_id", "claim_number");')
  }

  override async down(): Promise<void> {
    this.addSql('alter table "warranty_claims_claims" drop constraint "warranty_claims_claims_scope_project_claim_number_unique";')
    this.addSql('drop index "warranty_claims_claims_claim_number_idx";')
    this.addSql('alter table "warranty_claims_claims" drop column "claim_number";')
  }

}
