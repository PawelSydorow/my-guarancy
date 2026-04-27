import {
  buildWarrantyCategorySeeds,
  buildWarrantyProjectCatalog,
  buildWarrantyProjectSeeds,
} from './seeds'

describe('warranty seed catalog', () => {
  it('builds exactly ten projects', () => {
    const projects = buildWarrantyProjectSeeds()

    expect(projects).toHaveLength(10)
    expect(new Set(projects.map((project) => project.seedKey)).size).toBe(10)
    expect(new Set(projects.map((project) => project.code)).size).toBe(10)
  })

  it('builds ten category seeds', () => {
    const categories = buildWarrantyCategorySeeds()

    expect(categories).toHaveLength(10)
    expect(new Set(categories.map((category) => category.value)).size).toBe(10)
  })

  it('builds project-specific subcontractor and claim counts in the expected range', () => {
    const catalog = buildWarrantyProjectCatalog()
    const categoryValues = new Set(buildWarrantyCategorySeeds().map((category) => category.value))

    expect(catalog).toHaveLength(10)

    for (const entry of catalog) {
      expect(entry.subcontractors.length).toBeGreaterThanOrEqual(4)
      expect(entry.subcontractors.length).toBeLessThanOrEqual(10)
      expect(entry.claims.length).toBeGreaterThanOrEqual(3)
      expect(entry.claims.length).toBeLessThanOrEqual(5)

      for (const subcontractor of entry.subcontractors) {
        expect(subcontractor.projectSeedKey).toBe(entry.project.seedKey)
        expect(subcontractor.seedKey.startsWith(`subcontractor-${entry.project.seedKey}-`)).toBe(true)
      }

      for (const claim of entry.claims) {
        expect(categoryValues.has(claim.categoryKey)).toBe(true)
        expect(claim.projectSeedKey).toBe(entry.project.seedKey)
        expect(claim.basNumber).toContain(entry.project.code ?? entry.project.seedKey)
        expect(claim.basNumber).toContain(String(claim.claimNumber).padStart(2, '0'))
      }
    }
  })
})
