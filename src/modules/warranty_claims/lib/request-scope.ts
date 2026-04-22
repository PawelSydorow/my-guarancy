import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { resolveFeatureCheckContext } from '@open-mercato/core/modules/directory/utils/organizationScope'

export async function resolveWarrantyClaimsScope(request: Request) {
  const auth = await getAuthFromRequest(request)
  if (!auth?.tenantId) {
    return { auth: null, container: null, scope: null }
  }

  const container = await createRequestContainer()
  const { organizationId } = await resolveFeatureCheckContext({ container, auth, request })
  if (!organizationId) {
    return { auth, container, scope: null }
  }

  return {
    auth,
    container,
    scope: {
      tenantId: auth.tenantId,
      organizationId,
    },
  }
}
