import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { Role, RoleAcl } from '@open-mercato/core/modules/auth/data/entities'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { seedWarrantyClaimsDefaults } from './lib/seeds'

const DEFAULT_ROLE_FEATURES = {
  superadmin: ['warranty_claims.*'],
  admin: ['warranty_claims.*'],
}

async function ensureRoleFeatures(em: Parameters<NonNullable<ModuleSetupConfig['seedDefaults']>>[0]['em'], tenantId: string) {
  for (const [roleName, features] of Object.entries(DEFAULT_ROLE_FEATURES)) {
    const role = await findOneWithDecryption(em, Role, { name: roleName, tenantId }, {}, { tenantId, organizationId: null })
    if (!role) continue

    const acl = await findOneWithDecryption(em, RoleAcl, { role, tenantId }, {}, { tenantId, organizationId: null })
    if (!acl) {
      const record = em.create(RoleAcl, {
        role,
        tenantId,
        featuresJson: [...features],
        isSuperAdmin: roleName === 'superadmin',
        createdAt: new Date(),
      })
      await em.persistAndFlush(record)
      continue
    }

    const currentFeatures = Array.isArray(acl.featuresJson) ? acl.featuresJson : []
    const mergedFeatures = Array.from(new Set([...currentFeatures, ...features]))
    const changed =
      mergedFeatures.length !== currentFeatures.length ||
      mergedFeatures.some((value, index) => value !== currentFeatures[index])

    if (changed) {
      acl.featuresJson = mergedFeatures
    }
    if (roleName === 'superadmin') {
      acl.isSuperAdmin = true
    }
    if (changed || roleName === 'superadmin') {
      await em.persistAndFlush(acl)
    }
  }
}

export const setup: ModuleSetupConfig = {
  async seedDefaults({ em, tenantId, organizationId }) {
    await seedWarrantyClaimsDefaults(em, { tenantId, organizationId })
    await ensureRoleFeatures(em, tenantId)
  },
  defaultRoleFeatures: DEFAULT_ROLE_FEATURES,
}

export default setup
