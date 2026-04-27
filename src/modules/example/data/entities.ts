import { Entity, Index, OptionalProps, PrimaryKey, Property, Unique } from '@mikro-orm/core'

export type ExampleCustomerPriorityLevel = 'low' | 'normal' | 'high' | 'critical'

@Entity({ tableName: 'todos' })
@Index({ name: 'todos_org_tenant_idx', properties: ['organizationId', 'tenantId'] })
export class Todo {
  [OptionalProps]?: 'isDone' | 'createdAt' | 'updatedAt' | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ type: 'text' })
  title!: string

  @Property({ name: 'is_done', type: 'boolean', default: false })
  isDone: boolean = false

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'example_customer_priorities' })
@Index({ name: 'example_customer_priorities_customer_idx', properties: ['customerId'] })
@Index({ name: 'example_customer_priorities_org_tenant_idx', properties: ['organizationId', 'tenantId'] })
@Unique({ name: 'example_customer_priorities_scope_customer_unique', properties: ['organizationId', 'tenantId', 'customerId'] })
export class ExampleCustomerPriority {
  [OptionalProps]?: 'priority' | 'createdAt' | 'updatedAt' | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'customer_id', type: 'uuid' })
  customerId!: string

  @Property({ type: 'text', default: 'normal' })
  priority: ExampleCustomerPriorityLevel = 'normal'

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}
