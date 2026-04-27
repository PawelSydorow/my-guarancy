import { Migration } from '@mikro-orm/migrations';

export class Migration20260421212628 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "warranty_claims_projects" ("id" uuid not null default gen_random_uuid(), "seed_key" text not null, "organization_id" uuid not null, "tenant_id" uuid not null, "name" text not null, "code" text null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "warranty_claims_projects_pkey" primary key ("id"));`);
    this.addSql(`alter table "warranty_claims_projects" add constraint "warranty_claims_projects_scope_seed_key_unique" unique ("organization_id", "tenant_id", "seed_key");`);

    this.addSql(`create table "warranty_claims_project_subcontractors" ("id" uuid not null default gen_random_uuid(), "seed_key" text not null, "organization_id" uuid not null, "tenant_id" uuid not null, "project_id" uuid not null, "name" text not null, "address" text null, "email" text null, "phone" text null, "contact_person" text null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "warranty_claims_project_subcontractors_pkey" primary key ("id"));`);
    this.addSql(`create index "warranty_claims_subcontractors_project_idx" on "warranty_claims_project_subcontractors" ("project_id");`);
    this.addSql(`create index "warranty_claims_subcontractors_org_tenant_idx" on "warranty_claims_project_subcontractors" ("organization_id", "tenant_id");`);
    this.addSql(`alter table "warranty_claims_project_subcontractors" add constraint "warranty_claims_subcontractors_scope_seed_key_unique" unique ("organization_id", "tenant_id", "seed_key");`);

    this.addSql(`create table "warranty_claims_claims" ("id" uuid not null default gen_random_uuid(), "organization_id" uuid not null, "tenant_id" uuid not null, "is_active" boolean not null default true, "project_id" uuid not null, "title" text not null, "issue_description" text not null, "location_text" text not null, "priority_key" text not null, "category_key" text not null, "bas_number" text not null, "status_key" text not null, "reported_at" timestamptz not null, "assigned_user_id" uuid null, "resolved_at" timestamptz null, "subcontractor_id" uuid null, "subcontractor_name" text null, "subcontractor_address" text null, "subcontractor_email" text null, "subcontractor_phone" text null, "subcontractor_contact_person" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "warranty_claims_claims_pkey" primary key ("id"));`);
    this.addSql(`create index "warranty_claims_claims_project_idx" on "warranty_claims_claims" ("project_id");`);
    this.addSql(`create index "warranty_claims_claims_subcontractor_idx" on "warranty_claims_claims" ("subcontractor_id");`);
    this.addSql(`create index "warranty_claims_claims_assigned_user_idx" on "warranty_claims_claims" ("assigned_user_id");`);
    this.addSql(`create index "warranty_claims_claims_status_idx" on "warranty_claims_claims" ("status_key");`);
    this.addSql(`create index "warranty_claims_claims_priority_idx" on "warranty_claims_claims" ("priority_key");`);
    this.addSql(`create index "warranty_claims_claims_category_idx" on "warranty_claims_claims" ("category_key");`);
    this.addSql(`create index "warranty_claims_claims_org_tenant_idx" on "warranty_claims_claims" ("organization_id", "tenant_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "warranty_claims_claims" cascade;`);
    this.addSql(`drop table if exists "warranty_claims_project_subcontractors" cascade;`);
    this.addSql(`drop table if exists "warranty_claims_projects" cascade;`);
  }

}
