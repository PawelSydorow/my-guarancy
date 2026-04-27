import * as React from 'react'
import { Clock3, ArrowRightLeft, CheckCircle2, XCircle } from 'lucide-react'
import type { EnumBadgeMap } from '@open-mercato/ui/backend/ValueIcons'

export const WARRANTY_STATUS_BADGE_MAP: EnumBadgeMap = {
  oczekuje: {
    label: 'Oczekuje',
    className: 'border-status-warning-border text-status-warning-text bg-status-warning-bg',
    icon: React.createElement(Clock3, { className: 'size-3' }),
  },
  'przekazana_nieusunięta': {
    label: 'Przekazana nieusunięta',
    className: 'border-status-info-border text-status-info-text bg-status-info-bg',
    icon: React.createElement(ArrowRightLeft, { className: 'size-3' }),
  },
  usunięta: {
    label: 'Usunięta',
    className: 'border-status-success-border text-status-success-text bg-status-success-bg',
    icon: React.createElement(CheckCircle2, { className: 'size-3' }),
  },
  odrzucona: {
    label: 'Odrzucona',
    className: 'border-status-error-border text-status-error-text bg-status-error-bg',
    icon: React.createElement(XCircle, { className: 'size-3' }),
  },
}

export const WARRANTY_STATUS_SEGMENT_CLASSES: Record<string, string> = {
  oczekuje: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  'przekazana_nieusunięta': 'border-status-info-border bg-status-info-bg text-status-info-text',
  usunięta: 'border-status-success-border bg-status-success-bg text-status-success-text',
  odrzucona: 'border-status-error-border bg-status-error-bg text-status-error-text',
}

export const WARRANTY_PRIORITY_SEGMENT_CLASSES: Record<string, string> = {
  niski: 'border-status-success-border bg-status-success-bg text-status-success-text',
  sredni: 'border-status-info-border bg-status-info-bg text-status-info-text',
  wysoki: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  krytyczny: 'border-status-error-border bg-status-error-bg text-status-error-text',
}
