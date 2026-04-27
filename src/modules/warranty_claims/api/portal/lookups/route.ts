import { z } from 'zod'
import { getLookupBundle } from '../../../lib/lookups'
import { resolvePortalWarrantyClaimsScope } from '../../../lib/request-scope'
import { toPortalLookupBundle } from '../../../lib/portal'

export const metadata = {
  GET: {
    requireCustomerAuth: true,
  },
}

const querySchema = z.object({
  projectId: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  const context = await resolvePortalWarrantyClaimsScope(request)
  if (!context.scope || !context.container) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()))
  if (!parsed.success) {
    return Response.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const em = context.container.resolve('em')
  const bundle = await getLookupBundle(em, context.scope)
  return Response.json(toPortalLookupBundle(bundle))
}
