import { z } from 'zod'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { makeCrudRoute } from '@open-mercato/shared/lib/crud/factory'
import { WarrantyClaim } from '../../data/entities'
import {
  warrantyClaimCreateSchema,
  warrantyClaimListSchema,
  warrantyClaimUpdateSchema,
  type WarrantyClaimCreateInput,
  type WarrantyClaimListQuery,
  type WarrantyClaimUpdateInput,
} from '../../data/validators'
import {
  applyPreparedClaimToEntity,
  mapPreparedClaimToEntity,
  prepareClaimInput,
  serializeClaimRecord,
  type PreparedClaimInput,
} from '../../lib/claim-logic'
import { buildWarrantyClaimListFilters } from '../../lib/list-filters'

type ClaimListItem = ReturnType<typeof serializeClaimRecord>

function getScope(ctx: { auth: { tenantId?: string | null; orgId?: string | null } | null; selectedOrganizationId: string | null }) {
  const tenantId = ctx.auth?.tenantId ?? null
  const organizationId = ctx.selectedOrganizationId ?? ctx.auth?.orgId ?? null
  if (!tenantId || !organizationId) {
    throw new CrudHttpError(400, { error: 'Tenant and organization scope are required' })
  }
  return { tenantId, organizationId }
}

const querySchema = warrantyClaimListSchema.extend({
  format: z.enum(['json', 'csv']).optional(),
})

export const { metadata, GET, POST, PUT, DELETE } = makeCrudRoute<
  WarrantyClaimCreateInput,
  WarrantyClaimUpdateInput,
  z.infer<typeof querySchema>
>({
  metadata: {
    GET: { requireAuth: true, requireFeatures: ['warranty_claims.view'] },
    POST: { requireAuth: true, requireFeatures: ['warranty_claims.create', 'warranty_claims.manage'] },
    PUT: { requireAuth: true, requireFeatures: ['warranty_claims.edit', 'warranty_claims.manage'] },
    DELETE: { requireAuth: true, requireFeatures: ['warranty_claims.delete', 'warranty_claims.manage'] },
  },
  orm: {
    entity: WarrantyClaim,
    idField: 'id',
    orgField: 'organizationId',
    tenantField: 'tenantId',
    softDeleteField: 'deletedAt',
  },
  list: {
    schema: querySchema,
    buildFilters: async (query: WarrantyClaimListQuery, ctx) => buildWarrantyClaimListFilters(query, ctx.container.resolve('em'), getScope(ctx)),
    transformItem: (item: WarrantyClaim): ClaimListItem => serializeClaimRecord(item),
    allowCsv: true,
    csv: {
      headers: [
        'claim_number',
        'title',
        'bas_number',
        'project_id',
        'status_key',
        'priority_key',
        'category_key',
        'subcontractor_name',
        'assigned_user_id',
        'reported_at',
        'resolved_at',
        'updated_at',
      ],
      row: (item: ClaimListItem) => [
        item.claim_number_formatted || item.claim_number,
        item.title,
        item.bas_number,
        item.project_id,
        item.status_key,
        item.priority_key,
        item.category_key,
        item.subcontractor_name ?? '',
        item.assigned_user_id ?? '',
        item.reported_at,
        item.resolved_at ?? '',
        item.updated_at,
      ],
      filename: 'warranty_claims.csv',
    },
  },
  hooks: {
    beforeCreate: async (input, ctx) => {
      const scope = getScope(ctx)
      const em = ctx.container.resolve('em')
      return await prepareClaimInput(em, scope, input)
    },
    beforeUpdate: async (input, ctx) => {
      const scope = getScope(ctx)
      const em = ctx.container.resolve('em')
      const existing = await em.findOne(WarrantyClaim, {
        id: input.id,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        deletedAt: null,
      })
      if (!existing) throw new CrudHttpError(404, { error: 'Warranty claim not found' })
      return await prepareClaimInput(em, scope, input, existing)
    },
  },
  create: {
    schema: warrantyClaimCreateSchema,
    mapToEntity: (input, ctx) => {
      const scope = getScope(ctx)
      return mapPreparedClaimToEntity(input as PreparedClaimInput & { claim_number: number }, scope)
    },
    response: (entity: WarrantyClaim) => serializeClaimRecord(entity),
  },
  update: {
    schema: warrantyClaimUpdateSchema,
    getId: (input) => input.id,
    applyToEntity: async (entity: WarrantyClaim, input) => {
      applyPreparedClaimToEntity(entity, input as PreparedClaimInput)
    },
    response: (entity: WarrantyClaim) => serializeClaimRecord(entity),
  },
  del: {
    softDelete: true,
    response: () => ({ ok: true }),
  },
})
