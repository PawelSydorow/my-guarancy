import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { getLookupBundle } from '../../lib/lookups'

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

  const container = await createRequestContainer()
  const em = container.resolve('em')
  const bundle = await getLookupBundle(em, { tenantId: auth.tenantId, organizationId: auth.orgId })
  return Response.json(bundle)
}
