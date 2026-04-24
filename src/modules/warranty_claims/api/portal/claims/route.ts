import { raw } from '@mikro-orm/core'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { WarrantyClaim } from '../../../data/entities'
import { mapPreparedClaimToEntity, preparePortalClaimInput } from '../../../lib/claim-logic'
import { getDictionaryOptions } from '../../../lib/lookups'
import { resolvePortalWarrantyClaimsScope } from '../../../lib/request-scope'
import {
  parsePortalClaimsListQuery,
  portalClaimCreateSchema,
  toPortalClaimRecord,
} from '../../../lib/portal'
import { WARRANTY_DICTIONARY_KEYS } from '../../../lib/constants'

const claimNumberTextExpr = raw((alias) => `cast(${alias}.claim_number as text)`)

const SORT_FIELD_MAP = {
  reportedAt: 'reportedAt',
  resolvedAt: 'resolvedAt',
  statusKey: 'statusKey',
  priorityKey: 'priorityKey',
  claimNumber: 'claimNumber',
} as const

export const metadata = {
  GET: { requireCustomerAuth: true },
  POST: { requireCustomerAuth: true },
}

async function assertAllowedQueryValues(
  em: import('@mikro-orm/postgresql').EntityManager,
  scope: { tenantId: string; organizationId: string },
  query: { statusKey?: string; priorityKey?: string },
) {
  const [statuses, priorities] = await Promise.all([
    getDictionaryOptions(em, scope, WARRANTY_DICTIONARY_KEYS.status),
    getDictionaryOptions(em, scope, WARRANTY_DICTIONARY_KEYS.priority),
  ])
  const statusKeys = new Set(statuses.map((item) => item.id))
  const priorityKeys = new Set(priorities.map((item) => item.id))

  if (query.statusKey && !statusKeys.has(query.statusKey)) {
    throw new CrudHttpError(400, { error: 'Invalid statusKey' })
  }
  if (query.priorityKey && !priorityKeys.has(query.priorityKey)) {
    throw new CrudHttpError(400, { error: 'Invalid priorityKey' })
  }
}

export async function GET(request: Request) {
  try {
    const context = await resolvePortalWarrantyClaimsScope(request)
    if (!context.scope || !context.container) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = parsePortalClaimsListQuery(new URL(request.url).searchParams)
    const em = context.container.resolve('em') as import('@mikro-orm/postgresql').EntityManager

    await assertAllowedQueryValues(em, context.scope, query)

    const where: Record<string, unknown> = {
      tenantId: context.scope.tenantId,
      organizationId: context.scope.organizationId,
      deletedAt: null,
    }

    if (query.statusKey) where.statusKey = query.statusKey
    if (query.priorityKey) where.priorityKey = query.priorityKey
    if (query.search) {
      where.$or = [
        { title: { $ilike: `%${query.search}%` } },
        { issueDescription: { $ilike: `%${query.search}%` } },
        { [claimNumberTextExpr as unknown as string]: { $ilike: `%${query.search}%` } },
      ]
    }

    const [items, total] = await em.findAndCount(WarrantyClaim, where as any, {
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      orderBy: {
        [SORT_FIELD_MAP[query.sortBy]]: query.sortDir,
      } as any,
    })

    return Response.json({
      items: items.map((item) => toPortalClaimRecord(item)),
      total,
      page: query.page,
      limit: query.limit,
    })
  } catch (error) {
    if (error instanceof CrudHttpError) {
      return Response.json(error.body ?? { error: 'Bad request' }, { status: error.status })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolvePortalWarrantyClaimsScope(request)
    if (!context.scope || !context.container) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const parsed = portalClaimCreateSchema.safeParse(payload)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const em = context.container.resolve('em') as import('@mikro-orm/postgresql').EntityManager
    const prepared = await preparePortalClaimInput(em, context.scope, parsed.data)
    const entity = em.create(WarrantyClaim, mapPreparedClaimToEntity(prepared, context.scope))
    await em.persistAndFlush(entity)

    return Response.json(toPortalClaimRecord(entity), { status: 201 })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (error instanceof CrudHttpError) {
      return Response.json(error.body ?? { error: 'Bad request' }, { status: error.status })
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
