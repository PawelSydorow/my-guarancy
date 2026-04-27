import { lookupQuerySchema } from '../../data/validators'
import { getSubcontractorOptions } from '../../lib/lookups'
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

  const params = lookupQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()))
  const em = context.container.resolve('em')
  const items = await getSubcontractorOptions(
    em,
    context.scope,
    params.project_id,
    params.q ?? '',
    params.include_inactive,
  )

  return Response.json({ items })
}
