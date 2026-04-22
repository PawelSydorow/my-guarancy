import { getLookupBundle } from '../../lib/lookups'
import { resolveWarrantyClaimsScope } from '../../lib/request-scope'

export const metadata = {
  GET: {
    requireAuth: true,
    requireFeatures: ['warranty_claims.view'],
  },
}

export async function GET(request: Request) {
  const context = await resolveWarrantyClaimsScope(request)
  if (!context.scope || !context.container) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const em = context.container.resolve('em')
  const bundle = await getLookupBundle(em, context.scope)
  return Response.json(bundle)
}
