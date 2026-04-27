import type { ModuleInfo } from '@open-mercato/shared/modules/registry'

export const metadata: ModuleInfo = {
  name: 'warranty_claims',
  title: 'Warranty Claims',
  version: '0.1.0',
  description: 'Backoffice handling of warranty claims for construction projects.',
  author: 'OpenAI Codex',
  license: 'MIT',
  requires: ['auth', 'dictionaries'],
}

export default metadata
