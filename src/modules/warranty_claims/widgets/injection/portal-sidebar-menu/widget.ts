import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'

const widget: InjectionMenuItemWidget = {
  metadata: {
    id: 'warranty_claims.injection.portal-sidebar-menu',
  },
  menuItems: [
    {
      id: 'warranty-claims-list',
      label: 'Zgloszenia',
      icon: 'lucide:list',
      href: '/portal/warranty-claims',
      groupId: 'warranty-claims',
      groupLabel: 'Zgloszenia gwarancyjne',
      placement: { position: InjectionPosition.First },
    },
    {
      id: 'warranty-claims-create',
      label: 'Nowe zgloszenie',
      icon: 'lucide:plus-circle',
      href: '/portal/warranty-claims/create',
      groupId: 'warranty-claims',
      groupLabel: 'Zgloszenia gwarancyjne',
      placement: { position: InjectionPosition.After, relativeTo: 'warranty-claims-list' },
    },
  ],
}

export default widget
