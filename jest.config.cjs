module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/modules/warranty_claims'],
  testMatch: ['**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^#generated/(.*)$': '<rootDir>/.mercato/generated/$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@open-mercato|@mikro-orm)/)',
  ],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }],
  },
}
