import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { lookupQuerySchema } from '../../data/validators'
import { getUserOptions } from '../../lib/lookups'

export const metadata = {
  GET: {
    requireAuth: true,
    requireFeatures: ['warranty_claims.view'],
  },
}

export async function GET(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.tenantId || !auth.orgId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = lookupQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()))
  const container = await createRequestContainer()
  const em = container.resolve('em')
  const items = await getUserOptions(em, { tenantId: auth.tenantId, organizationId: auth.orgId }, params.q ?? '')
  return Response.json({ items })
}
