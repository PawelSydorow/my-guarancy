import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'

const widget: InjectionMenuItemWidget = {
  metadata: {
    id: 'warranty_claims.injection.portal-sidebar-menu',
  },
  menuItems: [
    {
      id: 'warranty-claims-create',
      label: 'Nowe zgłoszenie',
      icon: 'lucide:circle-plus',
      href: '/portal/warranty-claims/create',
      groupId: 'warranty-claims',
      groupLabel: 'Moje zgłoszenia',
      placement: { position: InjectionPosition.First },
    },
    {
      id: 'warranty-claims-list',
      label: 'Moje zgłoszenia',
      icon: 'lucide:clipboard-list',
      href: '/portal/warranty-claims',
      groupId: 'warranty-claims',
      groupLabel: 'Moje zgłoszenia',
      placement: { position: InjectionPosition.After, relativeTo: 'warranty-claims-create' },
    },
  ],
}

export default widget
