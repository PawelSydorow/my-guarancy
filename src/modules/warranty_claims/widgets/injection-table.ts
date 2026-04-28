import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

const injectionTable: ModuleInjectionTable = {
  'menu:portal:sidebar:main': {
    widgetId: 'warranty_claims.injection.portal-sidebar-menu',
    priority: 60,
  },
  'menu:sidebar:main': {
    widgetId: 'warranty_claims.injection.backend-sidebar-menu',
    priority: 60,
  },
}

export default injectionTable
