import { Entity, Index, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core'

@Entity({ tableName: 'warranty_claims_projects' })
@Unique({ name: 'warranty_claims_projects_scope_seed_key_unique', properties: ['organizationId', 'tenantId', 'seedKey'] })
export class Project {
  [OptionalProps]?: 'code' | 'isActive' | 'createdAt' | 'updatedAt' | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'seed_key', type: 'text' })
  seedKey!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ type: 'text', nullable: true })
  code?: string | null

  @Property({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'warranty_claims_project_subcontractors' })
@Index({ name: 'warranty_claims_subcontractors_project_idx', properties: ['projectId'] })
@Index({ name: 'warranty_claims_subcontractors_org_tenant_idx', properties: ['organizationId', 'tenantId'] })
@Unique({ name: 'warranty_claims_subcontractors_scope_seed_key_unique', properties: ['organizationId', 'tenantId', 'seedKey'] })
export class ProjectSubcontractor {
  [OptionalProps]?: 'address' | 'email' | 'phone' | 'contactPerson' | 'isActive' | 'createdAt' | 'updatedAt' | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'seed_key', type: 'text' })
  seedKey!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'project_id', type: 'uuid' })
  projectId!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ type: 'text', nullable: true })
  address?: string | null

  @Property({ type: 'text', nullable: true })
  email?: string | null

  @Property({ type: 'text', nullable: true })
  phone?: string | null

  @Property({ name: 'contact_person', type: 'text', nullable: true })
  contactPerson?: string | null

  @Property({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'warranty_claims_claims' })
@Index({ name: 'warranty_claims_claims_project_idx', properties: ['projectId'] })
@Index({ name: 'warranty_claims_claims_claim_number_idx', properties: ['claimNumber'] })
@Index({ name: 'warranty_claims_claims_subcontractor_idx', properties: ['subcontractorId'] })
@Index({ name: 'warranty_claims_claims_assigned_user_idx', properties: ['assignedUserId'] })
@Index({ name: 'warranty_claims_claims_status_idx', properties: ['statusKey'] })
@Index({ name: 'warranty_claims_claims_priority_idx', properties: ['priorityKey'] })
@Index({ name: 'warranty_claims_claims_category_idx', properties: ['categoryKey'] })
@Index({ name: 'warranty_claims_claims_org_tenant_idx', properties: ['organizationId', 'tenantId'] })
@Unique({ name: 'warranty_claims_claims_scope_project_claim_number_unique', properties: ['organizationId', 'tenantId', 'projectId', 'claimNumber'] })
export class WarrantyClaim {
  [OptionalProps]?: 'isActive' | 'assignedUserId' | 'resolvedAt' | 'rejectionReason' | 'subcontractorId' | 'subcontractorName' | 'subcontractorAddress' | 'subcontractorEmail' | 'subcontractorPhone' | 'subcontractorContactPerson' | 'createdAt' | 'updatedAt' | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true

  @Property({ name: 'project_id', type: 'uuid' })
  projectId!: string

  @Property({ name: 'claim_number', type: 'integer' })
  claimNumber!: number

  @Property({ type: 'text' })
  title!: string

  @Property({ name: 'issue_description', type: 'text' })
  issueDescription!: string

  @Property({ name: 'location_text', type: 'text' })
  locationText!: string

  @Property({ name: 'priority_key', type: 'text' })
  priorityKey!: string

  @Property({ name: 'category_key', type: 'text' })
  categoryKey!: string

  @Property({ name: 'bas_number', type: 'text' })
  basNumber!: string

  @Property({ name: 'status_key', type: 'text' })
  statusKey!: string

  @Property({ name: 'reported_at', type: Date })
  reportedAt!: Date

  @Property({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId?: string | null

  @Property({ name: 'resolved_at', type: Date, nullable: true })
  resolvedAt?: Date | null

  @Property({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null

  @Property({ name: 'subcontractor_id', type: 'uuid', nullable: true })
  subcontractorId?: string | null

  @Property({ name: 'subcontractor_name', type: 'text', nullable: true })
  subcontractorName?: string | null

  @Property({ name: 'subcontractor_address', type: 'text', nullable: true })
  subcontractorAddress?: string | null

  @Property({ name: 'subcontractor_email', type: 'text', nullable: true })
  subcontractorEmail?: string | null

  @Property({ name: 'subcontractor_phone', type: 'text', nullable: true })
  subcontractorPhone?: string | null

  @Property({ name: 'subcontractor_contact_person', type: 'text', nullable: true })
  subcontractorContactPerson?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}
