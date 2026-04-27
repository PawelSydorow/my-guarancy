import * as React from 'react'
import { Circle, CheckCircle2, Clock3 } from 'lucide-react'
import type { EnumBadgeMap } from '@open-mercato/ui/backend/ValueIcons'

export const WARRANTY_STATUS_BADGE_MAP: EnumBadgeMap = {
  oczekuje: {
    label: 'Oczekuje',
    className: 'border-status-warning-border text-status-warning-text bg-status-warning-bg',
    icon: React.createElement(Clock3, { className: 'size-3' }),
  },
  w_trakcie: {
    label: 'W trakcie',
    className: 'border-status-info-border text-status-info-text bg-status-info-bg',
    icon: React.createElement(Circle, { className: 'size-3' }),
  },
  zakonczone: {
    label: 'Zakonczone',
    className: 'border-status-success-border text-status-success-text bg-status-success-bg',
    icon: React.createElement(CheckCircle2, { className: 'size-3' }),
  },
}

export const WARRANTY_STATUS_SEGMENT_CLASSES: Record<string, string> = {
  oczekuje: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  w_trakcie: 'border-status-info-border bg-status-info-bg text-status-info-text',
  zakonczone: 'border-status-success-border bg-status-success-bg text-status-success-text',
}

export const WARRANTY_PRIORITY_SEGMENT_CLASSES: Record<string, string> = {
  niski: 'border-status-success-border bg-status-success-bg text-status-success-text',
  sredni: 'border-status-info-border bg-status-info-bg text-status-info-text',
  wysoki: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  krytyczny: 'border-status-error-border bg-status-error-bg text-status-error-text',
}
