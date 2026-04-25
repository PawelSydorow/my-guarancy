import { z } from 'zod'
import { WarrantyClaim } from '../../../../data/entities'
import { resolvePortalWarrantyClaimsScope } from '../../../../lib/request-scope'
import { toPortalClaimRecord } from '../../../../lib/portal'

export const metadata = {
  GET: { requireCustomerAuth: true },
}

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(request: Request, ctx?: { params?: Promise<{ id?: string }> }) {
  const context = await resolvePortalWarrantyClaimsScope(request)
  if (!context.scope || !context.container) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const routeParams = ctx?.params ? await ctx.params : {}
  const parsed = paramsSchema.safeParse(routeParams)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid id' }, { status: 400 })
  }

  const em = context.container.resolve('em') as import('@mikro-orm/postgresql').EntityManager
  const claim = await em.findOne(WarrantyClaim, {
    id: parsed.data.id,
    tenantId: context.scope.tenantId,
    organizationId: context.scope.organizationId,
    deletedAt: null,
  })

  if (!claim) {
    return Response.json({ error: 'Warranty claim not found' }, { status: 404 })
  }

  return Response.json(toPortalClaimRecord(claim))
}
