import type { ModuleInjectionTable } from '@open-mercato/shared/modules/widgets/injection'

const injectionTable: ModuleInjectionTable = {
  'menu:sidebar:main': {
    widgetId: 'warranty_claims.injection.sidebar-menu',
    priority: 60,
  },
}

export default injectionTable
